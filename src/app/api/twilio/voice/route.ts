import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio";
import { getCompanyProfile } from "@/lib/data/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio "A call comes in" webhook — the very first ring.
 * Configure your Twilio number's Voice Configuration to POST here:
 *   https://carmartrentals.com/api/twilio/voice
 *
 * What we do on the first hit:
 *  1. Create a call_logs row keyed by the call's CallSid.
 *  2. Greet the caller out loud with our company name.
 *  3. <Gather> a speech turn and post the transcription to /respond.
 */
export async function POST(req: NextRequest) {
  const url = req.url;
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) params[k] = String(v);

  // Reject anything not actually signed by Twilio — prevents abuse of our
  // OpenAI account by random people hitting this endpoint.
  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(signature, url, params)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const callSid = params.CallSid;
  const from = params.From || null;
  const to = params.To || null;

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
      },
      { onConflict: "call_sid" },
    );
  } catch {
    /* logging is best-effort */
  }

  // Personalized greeting using the live company name.
  const company = await getCompanyProfile();
  const greeting = `Thanks for calling ${company.name}. I'm the AI assistant — how can I help today?`;

  // Record the assistant's greeting in the transcript so it's part of the
  // conversation history when the next turn is generated.
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

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  twiml.say({ voice: "Polly.Joanna-Neural" }, greeting);
  twiml.gather({
    input: ["speech"],
    action: "/api/twilio/voice/respond",
    method: "POST",
    speechTimeout: "auto",
    speechModel: "googlev2_long",
    language: "en-US",
  });
  // Fallback: if the caller said nothing, prompt once and try again.
  twiml.say(
    { voice: "Polly.Joanna-Neural" },
    "Sorry, I didn't catch that. Please go ahead.",
  );
  twiml.redirect({ method: "POST" }, "/api/twilio/voice");

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
