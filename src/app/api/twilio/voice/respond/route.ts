import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyTwilioSignature,
  ownerPhoneNumber,
  sendSms,
} from "@/lib/twilio";
import { generateReceptionistTurn } from "@/lib/ai-receptionist";
import { SITE_URL } from "@/lib/constants";
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
  if (!verifyTwilioSignature(signature, url, params)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  const caller = params.From || "";
  const said = (params.SpeechResult || "").trim();

  const admin = createAdminClient();

  // Load the existing call row so we can append to its transcript.
  const { data: existing } = await admin
    .from("call_logs")
    .select("transcript, sms_sent, transferred")
    .eq("call_sid", callSid)
    .maybeSingle();
  const transcript: CallTranscriptEntry[] = Array.isArray(existing?.transcript)
    ? (existing!.transcript as CallTranscriptEntry[])
    : [];

  // If we got nothing back from speech recognition, re-prompt without
  // costing an OpenAI call.
  const VoiceResponse = twilio.twiml.VoiceResponse;
  if (!said) {
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Joanna-Neural" },
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
  let action = { sendBookingLink: false, transfer: false, endCall: false };
  try {
    const turn = await generateReceptionistTurn(transcript);
    spoken = turn.spoken;
    action = {
      sendBookingLink: Boolean(turn.action.sendBookingLink),
      transfer: Boolean(turn.action.transfer),
      endCall: Boolean(turn.action.endCall),
    };
  } catch {
    spoken =
      "I'm having a little trouble right now. Let me transfer you to a real person.";
    action.transfer = true;
  }

  // Append the assistant's turn.
  transcript.push({
    role: "assistant",
    content: spoken,
    at: new Date().toISOString(),
  });

  // Execute the SMS-booking-link action if requested.
  let smsSent = Boolean(existing?.sms_sent);
  if (action.sendBookingLink && caller) {
    try {
      await sendSms(
        caller,
        `Thanks for calling Car Mart Rentals! Here's the link to browse our fleet and book: ${SITE_URL}/vehicles — reply STOP to opt out.`,
      );
      smsSent = true;
    } catch {
      // If SMS fails (e.g. invalid number, A2P not registered yet), the AI
      // still claimed it was sent. Log it; we'll surface in the call detail.
    }
  }

  const transferred = Boolean(existing?.transferred) || action.transfer;

  // Persist the updated transcript + flags.
  try {
    await admin
      .from("call_logs")
      .update({
        transcript,
        sms_sent: smsSent,
        transferred,
      })
      .eq("call_sid", callSid);
  } catch {
    /* persistence is best-effort */
  }

  // Build the TwiML response.
  const twiml = new VoiceResponse();
  twiml.say({ voice: "Polly.Joanna-Neural" }, spoken);

  if (action.transfer && ownerPhoneNumber()) {
    twiml.say(
      { voice: "Polly.Joanna-Neural" },
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
      { voice: "Polly.Joanna-Neural" },
      "Are you still there? I'm happy to help with anything else.",
    );
    twiml.redirect({ method: "POST" }, "/api/twilio/voice");
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
