import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio";
import { getCompanyProfile, getAiVoiceSettings } from "@/lib/data/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio "A call comes in" webhook — the very first ring.
 * Configure your Twilio number's Voice Configuration to POST here:
 *   https://carmartrentals.com/api/twilio/voice
 *
 * The TwiML returned depends on the admin's Voice Mode setting:
 *  • "polly"    — legacy path: Say + Gather + chat completions per turn
 *  • "realtime" — new path:    <Connect><Stream> hands the call audio off
 *                              to the OpenAI Realtime bridge service
 */
export async function POST(req: NextRequest) {
  const url = req.url;
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) params[k] = String(v);

  // Reject anything not actually signed by Twilio — prevents abuse of our
  // OpenAI account. Skip verification in dev or when explicitly opted out
  // for first-time setup debugging.
  const signature = req.headers.get("x-twilio-signature");
  const skipVerify = process.env.TWILIO_SKIP_SIGNATURE_CHECK === "true";
  if (!skipVerify && !verifyTwilioSignature(signature, url, params, req.headers)) {
    console.error("twilio voice: signature mismatch", {
      receivedSig: signature?.slice(0, 12),
      url,
      host: req.headers.get("host"),
      proto: req.headers.get("x-forwarded-proto"),
    });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  const from = params.From || null;
  const to = params.To || null;

  // Decide which voice path serves this call. We do this up front so the
  // call_logs row records which mode handled it (useful for cost analysis).
  const voiceSettings = await getAiVoiceSettings();
  const bridgeWss = process.env.TWILIO_BRIDGE_WSS_URL || "";
  // Realtime requires a deployed bridge — fall back to Polly automatically
  // if the bridge URL isn't set, so misconfiguration never bricks the line.
  const effectiveMode =
    voiceSettings.mode === "realtime" && bridgeWss ? "realtime" : "polly";

  // Best-effort: create the log row. If it already exists (rare retries),
  // ignore the conflict.
  try {
    const admin = createAdminClient();
    await admin.from("call_logs").upsert(
      {
        call_sid: callSid,
        from_number: from,
        to_number: to,
        status: "in-progress",
        transcript: [],
        voice_mode: effectiveMode,
      },
      { onConflict: "call_sid" },
    );
  } catch {
    /* logging is best-effort */
  }

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (effectiveMode === "realtime") {
    // Hand the call's audio off to the bridge. The bridge opens an OpenAI
    // Realtime session and streams audio bidirectionally — no further
    // Twilio TwiML round-trips are needed during the conversation.
    const connect = twiml.connect();
    const stream = connect.stream({ url: bridgeWss });
    // Pass call metadata into the bridge as <Parameter> children. The
    // bridge reads these from Twilio's "start" message customParameters.
    stream.parameter({ name: "callSid", value: callSid });
    if (from) stream.parameter({ name: "from", value: from });
    if (to) stream.parameter({ name: "to", value: to });
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // ----- Legacy Polly path -----
  const company = await getCompanyProfile();
  const greeting = `Thanks for calling ${company.name}. I'm the AI assistant — how can I help today?`;
  // Cast to the Twilio SayVoice union — picked from a known-good list in admin.
  type SayVoice = NonNullable<
    Parameters<twilio.twiml.VoiceResponse["say"]>[0]
  > extends { voice?: infer V }
    ? V
    : string;
  const pollyVoice = voiceSettings.voice as SayVoice;

  try {
    const admin = createAdminClient();
    await admin
      .from("call_logs")
      .update({
        transcript: [
          { role: "assistant", content: greeting, at: new Date().toISOString() },
        ],
      })
      .eq("call_sid", callSid);
  } catch {
    /* ignore */
  }

  twiml.say({ voice: pollyVoice }, greeting);
  twiml.gather({
    input: ["speech"],
    action: "/api/twilio/voice/respond",
    method: "POST",
    speechTimeout: "auto",
    speechModel: "googlev2_long",
    language: "en-US",
  });
  twiml.say({ voice: pollyVoice }, "Sorry, I didn't catch that. Please go ahead.");
  twiml.redirect({ method: "POST" }, "/api/twilio/voice");

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
