import { WebSocket } from "ws";
import { config } from "./config.js";
import {
  executeTool,
  fetchSessionConfig,
  logCallEnd,
  type SessionConfig,
} from "./app-callback.js";

/**
 * Bridges a single Twilio Media Stream WebSocket to a single OpenAI Realtime
 * WebSocket. Both endpoints exchange base64-encoded g711_ulaw audio at 8 kHz,
 * so we can pass audio frames straight through with zero conversion.
 *
 * Lifecycle:
 *  1. Twilio sends {event: "start"} — we open OpenAI WS and send session config
 *  2. Twilio sends {event: "media"} — we forward audio.append events to OpenAI
 *  3. OpenAI sends response.audio.delta — we forward as media frames to Twilio
 *  4. OpenAI sends response.function_call_arguments.done — we execute the tool
 *     via Vercel callback and feed the result back into the conversation
 *  5. Twilio sends {event: "stop"} — we close OpenAI WS and log the call
 */
export class RealtimeSession {
  private openaiWs: WebSocket | null = null;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private fromNumber: string | null = null;
  private toNumber: string | null = null;
  private sessionConfig: SessionConfig | null = null;

  // Transcript accumulator — we append the user's final transcribed turn
  // and the assistant's spoken text, then ship them to the app on call-end.
  private transcript: Array<{
    role: "user" | "assistant";
    content: string;
    at: string;
  }> = [];
  // Buffer for the in-flight assistant response (streamed token-by-token).
  private currentAssistantText = "";

  // Token counters for cost computation.
  private inputAudioTokens = 0;
  private outputAudioTokens = 0;
  private inputTextTokens = 0;
  private outputTextTokens = 0;

  // Pending hangup — set when a tool result asks us to end the call after
  // the assistant finishes speaking.
  private pendingHangup = false;

  constructor(private twilioWs: WebSocket) {
    this.attachTwilioHandlers();
  }

  // ----- Twilio side -----

  private attachTwilioHandlers() {
    this.twilioWs.on("message", (raw) => this.handleTwilioMessage(raw));
    this.twilioWs.on("close", () => this.shutdown("twilio_close"));
    this.twilioWs.on("error", (err) => {
      console.error("[bridge] twilio ws error", err);
      this.shutdown("twilio_error");
    });
  }

  private async handleTwilioMessage(raw: unknown) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    const event = String(data.event || "");

    if (event === "start") {
      // Twilio injects our custom <Parameter> values into start.customParameters.
      const start = (data.start as Record<string, unknown>) ?? {};
      const params =
        (start.customParameters as Record<string, string>) ?? {};
      this.streamSid = String(start.streamSid || "");
      this.callSid = params.callSid || String(start.callSid || "");
      this.fromNumber = params.from || null;
      this.toNumber = params.to || null;
      console.log("[bridge] stream start", {
        streamSid: this.streamSid,
        callSid: this.callSid,
        from: this.fromNumber,
      });
      await this.openOpenAi();
    } else if (event === "media") {
      const media = (data.media as Record<string, string>) ?? {};
      const payload = media.payload;
      if (payload && this.openaiWs?.readyState === WebSocket.OPEN) {
        this.openaiWs.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: payload,
          }),
        );
      }
    } else if (event === "stop") {
      console.log("[bridge] stream stop", { streamSid: this.streamSid });
      this.shutdown("twilio_stop");
    }
  }

  // ----- OpenAI side -----

  private async openOpenAi() {
    if (!this.callSid) {
      console.error("[bridge] no callSid on stream start — aborting");
      this.twilioWs.close();
      return;
    }

    // Get the system prompt + tool definitions + voice from the app.
    try {
      this.sessionConfig = await fetchSessionConfig({
        callSid: this.callSid,
        fromNumber: this.fromNumber,
        toNumber: this.toNumber,
      });
    } catch (err) {
      console.error("[bridge] failed to fetch session config", err);
      this.twilioWs.close();
      return;
    }

    // GA Realtime API endpoint. No more OpenAI-Beta header — that header
    // now triggers a "beta_api_shape_disabled" error.
    const url = `wss://api.openai.com/v1/realtime?model=${config.realtimeModel}`;
    this.openaiWs = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
    });

    this.openaiWs.on("open", () => {
      console.log("[bridge] openai ws open");
      this.sendSessionUpdate();
      this.sendInitialGreeting();
    });
    this.openaiWs.on("message", (raw) => this.handleOpenAiMessage(raw));
    this.openaiWs.on("close", () => {
      console.log("[bridge] openai ws closed");
    });
    this.openaiWs.on("error", (err) => {
      console.error("[bridge] openai ws error", err);
    });
  }

  private sendSessionUpdate() {
    if (!this.openaiWs || !this.sessionConfig) return;
    // GA Realtime API schema (May 2026+):
    //  - session.type is required ("realtime" for speech-to-speech)
    //  - audio config is nested under audio.input / audio.output
    //  - G.711 μ-law for Twilio = { type: "audio/pcmu", rate: 8000 }
    //  - voice moved to audio.output.voice
    //  - turn_detection moved to audio.input.turn_detection
    //  - input_audio_transcription renamed to transcription, under audio.input
    //  - modalities renamed to output_modalities (audio-only is fine — we get
    //    the transcript via response.output_audio_transcript events)
    this.openaiWs.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          model: config.realtimeModel,
          output_modalities: ["audio"],
          instructions: this.sessionConfig.systemPrompt,
          audio: {
            input: {
              // pcmu is implicitly 8 kHz μ-law (G.711) — no `rate` field
              // accepted; including it errors with unknown_parameter and
              // OpenAI silently falls back to 24 kHz PCM16, which Twilio
              // then plays back as garbled high-pitched noise.
              format: { type: "audio/pcmu" },
              transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
            output: {
              format: { type: "audio/pcmu" },
              voice: this.sessionConfig.voice,
            },
          },
          tools: this.sessionConfig.tools,
          tool_choice: "auto",
        },
      }),
    );
  }

  private sendInitialGreeting() {
    if (!this.openaiWs || !this.sessionConfig) return;
    // Ask the model to open the call with our exact greeting. Cleaner than
    // pre-seeding a conversation item (which now needs the GA "output_text"
    // content type for assistant messages).
    this.openaiWs.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: `Start the call by saying exactly this, in a warm friendly tone: "${this.sessionConfig.greeting}"`,
        },
      }),
    );
    this.transcript.push({
      role: "assistant",
      content: this.sessionConfig.greeting,
      at: new Date().toISOString(),
    });
  }

  private async handleOpenAiMessage(raw: unknown) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    const type = String(data.type || "");

    // Audio delta — forward to Twilio as a media frame.
    // (GA renamed from response.audio.delta to response.output_audio.delta)
    if (type === "response.output_audio.delta") {
      const delta = String(data.delta || "");
      if (delta && this.streamSid && this.twilioWs.readyState === WebSocket.OPEN) {
        this.twilioWs.send(
          JSON.stringify({
            event: "media",
            streamSid: this.streamSid,
            media: { payload: delta },
          }),
        );
      }
    }
    // The user started talking — interrupt any in-flight assistant audio
    // so the caller can talk over the AI naturally.
    else if (type === "input_audio_buffer.speech_started") {
      if (this.streamSid && this.twilioWs.readyState === WebSocket.OPEN) {
        this.twilioWs.send(
          JSON.stringify({ event: "clear", streamSid: this.streamSid }),
        );
      }
      if (this.openaiWs?.readyState === WebSocket.OPEN) {
        this.openaiWs.send(JSON.stringify({ type: "response.cancel" }));
      }
    }
    // The user finished talking — Whisper transcript is in.
    else if (type === "conversation.item.input_audio_transcription.completed") {
      const txt = String(data.transcript || "").trim();
      if (txt) {
        this.transcript.push({
          role: "user",
          content: txt,
          at: new Date().toISOString(),
        });
      }
    }
    // Assistant streamed text — accumulate so we can log the final reply.
    // (GA renamed audio_transcript → output_audio_transcript)
    else if (type === "response.output_audio_transcript.delta") {
      this.currentAssistantText += String(data.delta || "");
    } else if (type === "response.output_audio_transcript.done") {
      const txt = (data.transcript ?? this.currentAssistantText)
        .toString()
        .trim();
      if (txt) {
        this.transcript.push({
          role: "assistant",
          content: txt,
          at: new Date().toISOString(),
        });
      }
      this.currentAssistantText = "";
    }
    // Tool call from OpenAI — execute via Vercel callback.
    else if (type === "response.function_call_arguments.done") {
      const callId = String(data.call_id || "");
      const name = String(data.name || "");
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(String(data.arguments || "{}"));
      } catch {
        /* args left empty */
      }
      await this.handleToolCall(callId, name, args);
    }
    // Usage accounting — accumulate tokens for cost reporting.
    else if (type === "response.done") {
      const response = (data.response as Record<string, unknown>) ?? {};
      const usage = (response.usage as Record<string, unknown>) ?? {};
      const inputDetails =
        (usage.input_token_details as Record<string, number>) ?? {};
      const outputDetails =
        (usage.output_token_details as Record<string, number>) ?? {};
      this.inputAudioTokens += Number(inputDetails.audio_tokens ?? 0);
      this.outputAudioTokens += Number(outputDetails.audio_tokens ?? 0);
      this.inputTextTokens += Number(inputDetails.text_tokens ?? 0);
      this.outputTextTokens += Number(outputDetails.text_tokens ?? 0);

      // If a previous tool result asked us to hang up after speaking,
      // close the call now that the goodbye has been spoken.
      if (this.pendingHangup) {
        setTimeout(() => this.twilioWs.close(), 800);
      }
    } else if (type === "error") {
      console.error("[bridge] openai error event", data);
    }
  }

  private async handleToolCall(
    callId: string,
    name: string,
    args: Record<string, unknown>,
  ) {
    if (!this.callSid || !this.openaiWs) return;
    console.log("[bridge] tool call", { name, args });
    let result: string;
    try {
      const out = await executeTool({
        callSid: this.callSid,
        name,
        arguments: args,
      });
      result = out.result;
      if (out.endCall) this.pendingHangup = true;
      // Transfer = end the AI side and dial the owner.
      // (We surface this as a tool result; the AI's next reply should be a
      // brief "connecting you now" line, then we close + Twilio's dial
      // verb takes over via a separate <Dial> on a follow-up TwiML.)
      // Simpler: just hang up — the caller will be told to call back if
      // OWNER_PHONE_NUMBER is unset. For now we treat transfer as endCall;
      // a full transfer flow would require coordinating with Twilio's REST
      // API mid-call, which we can add in a follow-up.
      if (out.transferTo) this.pendingHangup = true;
    } catch (err) {
      console.error("[bridge] tool execution failed", err);
      result = "Tool execution failed. Apologize briefly and offer to transfer.";
    }

    // Feed the tool result back to OpenAI and ask for the next reply.
    this.openaiWs.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: result,
        },
      }),
    );
    this.openaiWs.send(JSON.stringify({ type: "response.create" }));
  }

  // ----- shutdown -----

  private hasShutdown = false;
  private async shutdown(reason: string) {
    if (this.hasShutdown) return;
    this.hasShutdown = true;
    console.log("[bridge] shutdown", { reason, callSid: this.callSid });

    try {
      this.openaiWs?.close();
    } catch {
      /* ignore */
    }
    try {
      this.twilioWs.close();
    } catch {
      /* ignore */
    }

    // Best-effort log to the app so transcripts + cost data are saved.
    if (this.callSid) {
      try {
        await logCallEnd({
          callSid: this.callSid,
          transcript: this.transcript,
          inputAudioTokens: this.inputAudioTokens,
          outputAudioTokens: this.outputAudioTokens,
          inputTextTokens: this.inputTextTokens,
          outputTextTokens: this.outputTextTokens,
        });
      } catch (err) {
        console.error("[bridge] logCallEnd failed", err);
      }
    }
  }
}
