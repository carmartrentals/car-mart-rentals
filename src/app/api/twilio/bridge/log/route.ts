import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeSecret } from "@/lib/bridge-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CallTranscriptEntry } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bridge calls this once per call when its WebSocket closes. We persist
 * the full transcript + token usage. The status webhook (separately fired by
 * Twilio when the call hangs up) handles duration + cost computation —
 * keeping that logic in one place.
 */
export async function POST(req: NextRequest) {
  if (!verifyBridgeSecret(req.headers.get("x-bridge-secret"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: {
    callSid?: string;
    transcript?: CallTranscriptEntry[];
    inputAudioTokens?: number;
    outputAudioTokens?: number;
    inputTextTokens?: number;
    outputTextTokens?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const callSid = body.callSid || "";
  if (!callSid) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const admin = createAdminClient();
    await admin
      .from("call_logs")
      .update({
        transcript: Array.isArray(body.transcript) ? body.transcript : [],
        realtime_input_audio_tokens: Number(body.inputAudioTokens ?? 0),
        realtime_output_audio_tokens: Number(body.outputAudioTokens ?? 0),
        realtime_input_text_tokens: Number(body.inputTextTokens ?? 0),
        realtime_output_text_tokens: Number(body.outputTextTokens ?? 0),
      })
      .eq("call_sid", callSid);
  } catch (err) {
    console.error("bridge log failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
