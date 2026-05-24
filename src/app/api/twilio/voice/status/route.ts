import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio";
import { summarizeCall } from "@/lib/ai-receptionist";
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
  if (!verifyTwilioSignature(signature, url, params)) {
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

  // Terminal: load the transcript and summarize.
  const { data: row } = await admin
    .from("call_logs")
    .select("transcript")
    .eq("call_sid", callSid)
    .maybeSingle();
  const transcript: CallTranscriptEntry[] = Array.isArray(row?.transcript)
    ? (row!.transcript as CallTranscriptEntry[])
    : [];

  let summary = "";
  let intent = "general";
  let callerName: string | null = null;
  try {
    const r = await summarizeCall(transcript);
    summary = r.summary;
    intent = r.intent;
    callerName = r.callerName;
  } catch {
    /* summary is best-effort */
  }

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
    })
    .eq("call_sid", callSid);

  return new NextResponse("ok");
}
