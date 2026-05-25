import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyTwilioSignature,
  ownerPhoneNumber,
  sendSms,
} from "@/lib/twilio";
import { generateReceptionistTurn, CALL_RATES } from "@/lib/ai-receptionist";
import { notifyCustomer } from "@/lib/notifications";
import { SITE_URL } from "@/lib/constants";
import { getAiVoiceSettings } from "@/lib/data/settings";
import type { CallTranscriptEntry } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous timeout because the OpenAI call is on the critical path between
// the caller speaking and our reply being spoken back.
export const maxDuration = 30;

/**
 * Twilio posts here every time the caller finishes speaking a turn. We:
 *  1. Read the SpeechResult (Google v2 transcription).
 *  2. Load the call's transcript so far from Supabase.
 *  3. Ask gpt-4o-mini for the next reply, with the system prompt + history.
 *  4. Execute any action markers (SEND_BOOKING_LINK / TRANSFER / END_CALL).
 *  5. Persist both turns to Supabase.
 *  6. Return TwiML: <Say> the reply, then another <Gather> for the next turn
 *     (or <Dial> / <Hangup> if the AI chose to transfer or end).
 */
export async function POST(req: NextRequest) {
  const url = req.url;
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature");
  const skipVerify = process.env.TWILIO_SKIP_SIGNATURE_CHECK === "true";
  if (!skipVerify && !verifyTwilioSignature(signature, url, params, req.headers)) {
    console.error("twilio respond: signature mismatch", {
      url,
      host: req.headers.get("host"),
    });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  const caller = params.From || "";
  const said = (params.SpeechResult || "").trim();

  // Use the configured Polly voice (operator can A/B test from admin settings).
  // Cast to the Twilio SayVoice union — the operator picks from a known-good
  // list of Polly voice ids in admin settings.
  const voiceSettings = await getAiVoiceSettings();
  type SayVoice = NonNullable<
    Parameters<twilio.twiml.VoiceResponse["say"]>[0]
  > extends { voice?: infer V }
    ? V
    : string;
  const pollyVoice = voiceSettings.voice as SayVoice;

  const admin = createAdminClient();

  // Load the existing call row so we can append to its transcript.
  const { data: existing } = await admin
    .from("call_logs")
    .select(
      "transcript, sms_sent, email_sent, transferred, prompt_tokens, completion_tokens",
    )
    .eq("call_sid", callSid)
    .maybeSingle();
  const transcript: CallTranscriptEntry[] = Array.isArray(existing?.transcript)
    ? (existing!.transcript as CallTranscriptEntry[])
    : [];
  const priorPromptTokens = Number(existing?.prompt_tokens ?? 0);
  const priorCompletionTokens = Number(existing?.completion_tokens ?? 0);

  // If we got nothing back from speech recognition, re-prompt without
  // costing an OpenAI call.
  const VoiceResponse = twilio.twiml.VoiceResponse;
  if (!said) {
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: pollyVoice },
      "Sorry, I missed that — could you say it again?",
    );
    twiml.gather({
      input: ["speech"],
      action: "/api/twilio/voice/respond",
      method: "POST",
      speechTimeout: "auto",
      speechModel: "googlev2_long",
      language: "en-US",
    });
    twiml.redirect({ method: "POST" }, "/api/twilio/voice");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Append the caller's turn.
  transcript.push({
    role: "user",
    content: said,
    at: new Date().toISOString(),
  });

  // Ask the AI for the next reply.
  let spoken = "";
  let action: {
    sendBookingLink: boolean;
    sendBookingEmail: string | null;
    transfer: boolean;
    endCall: boolean;
  } = {
    sendBookingLink: false,
    sendBookingEmail: null,
    transfer: false,
    endCall: false,
  };
  let turnPromptTokens = 0;
  let turnCompletionTokens = 0;
  try {
    const turn = await generateReceptionistTurn(transcript);
    spoken = turn.spoken;
    action = {
      sendBookingLink: Boolean(turn.action.sendBookingLink),
      sendBookingEmail: turn.action.sendBookingEmail ?? null,
      transfer: Boolean(turn.action.transfer),
      endCall: Boolean(turn.action.endCall),
    };
    turnPromptTokens = turn.promptTokens;
    turnCompletionTokens = turn.completionTokens;
  } catch {
    spoken =
      "I'm having a little trouble right now. Let me transfer you to a real person.";
    action.transfer = true;
  }

  // Per-turn OpenAI cost — lets the admin see which replies were expensive.
  const turnCost =
    (turnPromptTokens * CALL_RATES.openaiInputPerMillion +
      turnCompletionTokens * CALL_RATES.openaiOutputPerMillion) /
    1_000_000;

  // Append the assistant's turn with its own token + cost stamp.
  transcript.push({
    role: "assistant",
    content: spoken,
    at: new Date().toISOString(),
    prompt_tokens: turnPromptTokens,
    completion_tokens: turnCompletionTokens,
    cost: Math.round(turnCost * 10_000) / 10_000,
  });

  // Execute the EMAIL-booking-link action if requested. Email is the
  // primary delivery channel because US SMS without A2P 10DLC registration
  // is unreliable — carriers silently drop it (Twilio error 30034).
  let emailSent = Boolean(existing?.email_sent);
  let callerEmail: string | null = null;
  if (action.sendBookingEmail) {
    const email = action.sendBookingEmail.trim();
    // Belt-and-suspenders email validation since the address came out of
    // speech recognition (often gets "john at gmail dot com" wrong).
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        await notifyCustomer({
          type: "ai_receptionist_booking_link",
          to: email,
          subject: "Your Car Mart Rentals booking link",
          heading: "Ready to book your rental",
          intro:
            "Thanks for calling Car Mart Rentals! Here's the link to browse our fleet and complete your reservation in about a minute.",
          rows: [
            { label: "Pickup location", value: "Van Nuys, CA" },
            {
              label: "Need help",
              value: "Reply to this email or call us back any time.",
            },
          ],
          cta: { label: "Browse the Fleet", path: "/vehicles" },
        });
        emailSent = true;
        callerEmail = email;
        console.log("ai-receptionist: booking-link email sent", {
          callSid,
          to: email,
        });
      } catch (e) {
        console.error("ai-receptionist: booking-link email failed", {
          callSid,
          to: email,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      console.error("ai-receptionist: invalid email from AI marker", {
        callSid,
        email,
      });
    }
  }

  // Execute the SMS-booking-link action if requested (legacy / A2P-ready).
  let smsSent = Boolean(existing?.sms_sent);
  if (action.sendBookingLink && caller) {
    try {
      const result = await sendSms(
        caller,
        `Thanks for calling Car Mart Rentals! Here's the link to browse our fleet and book: ${SITE_URL}/vehicles — reply STOP to opt out.`,
      );
      smsSent = true;
      // Twilio accepts the API call and returns 'queued'/'sending' even when
      // the carrier later drops it (A2P 10DLC). Log the SID + status so we
      // can correlate with Twilio's Messaging Logs.
      console.log("twilio sms queued", {
        callSid,
        to: caller,
        sid: result.sid,
        status: result.status,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("twilio sms send failed", {
        callSid,
        to: caller,
        error: msg,
      });
    }
  }

  const transferred = Boolean(existing?.transferred) || action.transfer;

  // Persist the updated transcript + flags + accumulated token usage.
  try {
    const update: Record<string, unknown> = {
      transcript,
      sms_sent: smsSent,
      transferred,
      prompt_tokens: priorPromptTokens + turnPromptTokens,
      completion_tokens: priorCompletionTokens + turnCompletionTokens,
    };
    if (emailSent) update.email_sent = true;
    if (callerEmail) update.caller_email = callerEmail;
    await admin.from("call_logs").update(update).eq("call_sid", callSid);
  } catch {
    /* persistence is best-effort */
  }

  // Build the TwiML response.
  const twiml = new VoiceResponse();
  twiml.say({ voice: pollyVoice }, spoken);

  if (action.transfer && ownerPhoneNumber()) {
    twiml.say(
      { voice: pollyVoice },
      "Connecting you now — one moment.",
    );
    twiml.dial(
      {
        // Brief timeout so the caller isn't stuck if the owner's phone is off.
        timeout: 25,
        callerId: process.env.TWILIO_PHONE_NUMBER || undefined,
      },
      ownerPhoneNumber()!,
    );
  } else if (action.endCall) {
    twiml.hangup();
  } else {
    twiml.gather({
      input: ["speech"],
      action: "/api/twilio/voice/respond",
      method: "POST",
      speechTimeout: "auto",
      speechModel: "googlev2_long",
      language: "en-US",
    });
    // Re-prompt loop if the caller doesn't speak after our reply.
    twiml.say(
      { voice: pollyVoice },
      "Are you still there? I'm happy to help with anything else.",
    );
    twiml.redirect({ method: "POST" }, "/api/twilio/voice");
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
