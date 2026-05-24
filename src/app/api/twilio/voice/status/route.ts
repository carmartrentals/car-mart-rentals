import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio";
import { summarizeCall, computeCallCost } from "@/lib/ai-receptionist";
import type { CallTranscriptEntry } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Twilio lifecycle webhook — fires on call status changes. Configure your
 * Twilio number's "Call status changes" webhook to POST here:
 *   https://carmartrentals.com/api/twilio/voice/status
 *
 * When the call ends (CallStatus = completed), we:
 *  - Record the end timestamp + duration + recording URL
 *  - Ask the AI to summarize the conversation + infer the caller's intent
 *  - Persist the result for the admin call log
 */
export async function POST(req: NextRequest) {
  const url = req.url;
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature");
  const skipVerify = process.env.TWILIO_SKIP_SIGNATURE_CHECK === "true";
  if (!skipVerify && !verifyTwilioSignature(signature, url, params, req.headers)) {
    console.error("twilio status: signature mismatch", { url });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  const status = params.CallStatus || "unknown";
  const duration = Number(params.CallDuration || 0);
  const recordingUrl = params.RecordingUrl || null;

  const admin = createAdminClient();

  // For non-terminal events (ringing, in-progress), just update the status.
  if (status !== "completed" && status !== "failed" && status !== "no-answer" && status !== "busy" && status !== "canceled") {
    await admin
      .from("call_logs")
      .update({ status })
      .eq("call_sid", callSid);
    return new NextResponse("ok");
  }

  // Terminal: load the transcript + accumulated tokens and summarize.
  const { data: row } = await admin
    .from("call_logs")
    .select("transcript, prompt_tokens, completion_tokens")
    .eq("call_sid", callSid)
    .maybeSingle();
  const transcript: CallTranscriptEntry[] = Array.isArray(row?.transcript)
    ? (row!.transcript as CallTranscriptEntry[])
    : [];
  const accumulatedPrompt = Number(row?.prompt_tokens ?? 0);
  const accumulatedCompletion = Number(row?.completion_tokens ?? 0);

  let summary = "";
  let intent = "general";
  let callerName: string | null = null;
  let summaryPrompt = 0;
  let summaryCompletion = 0;
  try {
    const r = await summarizeCall(transcript);
    summary = r.summary;
    intent = r.intent;
    callerName = r.callerName;
    summaryPrompt = r.promptTokens;
    summaryCompletion = r.completionTokens;
  } catch {
    /* summary is best-effort */
  }

  // Final token counts include the summary call we just made.
  const totalPrompt = accumulatedPrompt + summaryPrompt;
  const totalCompletion = accumulatedCompletion + summaryCompletion;

  // Compute the full cost breakdown from rates + duration + tokens.
  const cost = computeCallCost({
    durationSeconds: duration || 0,
    promptTokens: totalPrompt,
    completionTokens: totalCompletion,
  });

  await admin
    .from("call_logs")
    .update({
      status,
      ended_at: new Date().toISOString(),
      duration_seconds: duration || null,
      recording_url: recordingUrl,
      ai_summary: summary || null,
      customer_intent: intent,
      caller_name: callerName,
      prompt_tokens: totalPrompt,
      completion_tokens: totalCompletion,
      twilio_voice_cost: cost.twilioVoice,
      twilio_speech_cost: cost.twilioSpeech,
      openai_cost: cost.openai,
      total_cost: cost.total,
    })
    .eq("call_sid", callSid);

  return new NextResponse("ok");
}
