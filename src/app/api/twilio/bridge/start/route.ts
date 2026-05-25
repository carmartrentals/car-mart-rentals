import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeSecret } from "@/lib/bridge-auth";
import { buildRealtimeSessionConfig } from "@/lib/ai-receptionist";
import { getAiVoiceSettings } from "@/lib/data/settings";
import { ownerPhoneNumber } from "@/lib/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bridge calls this when a call starts. We return the system prompt,
 * tool definitions, voice id, greeting, and the owner phone for transfers.
 *
 * Auth: x-bridge-secret header (shared secret with the bridge service).
 */
export async function POST(req: NextRequest) {
  if (!verifyBridgeSecret(req.headers.get("x-bridge-secret"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: { callSid?: string; fromNumber?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    /* tolerate missing body */
  }

  const config = await buildRealtimeSessionConfig();
  const voiceSettings = await getAiVoiceSettings();

  // Persist the greeting as the first transcript entry so the admin call
  // detail page shows the full conversation including how it opened.
  if (body.callSid) {
    try {
      const admin = createAdminClient();
      await admin
        .from("call_logs")
        .update({
          transcript: [
            {
              role: "assistant",
              content: config.greeting,
              at: new Date().toISOString(),
            },
          ],
        })
        .eq("call_sid", body.callSid);
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({
    systemPrompt: config.systemPrompt,
    greeting: config.greeting,
    tools: config.tools,
    voice: voiceSettings.realtime_voice,
    ownerPhone: ownerPhoneNumber(),
  });
}
