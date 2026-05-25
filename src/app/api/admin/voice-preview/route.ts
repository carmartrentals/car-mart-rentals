import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, aiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate an audio sample of a Realtime voice so the operator can hear
 * what each voice sounds like before saving the setting. We use OpenAI's
 * TTS API (gpt-4o-mini-tts) which exposes the exact same voice ids the
 * Realtime API uses — coral, ash, verse, nova, etc.
 *
 * Returns an MP3 stream. The settings UI plays it via a regular <Audio>.
 */

// Realtime voice ids that are valid for OpenAI TTS too.
const VALID_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
]);

const SAMPLE_TEXT =
  "Thanks for calling Car Mart Rentals. I'm the AI assistant — how can I help today?";

export async function GET(req: NextRequest) {
  // Admin-only. Don't let random visitors burn OpenAI credits.
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!aiConfigured()) {
    return new NextResponse("OPENAI_API_KEY not set.", { status: 500 });
  }

  const voice = (req.nextUrl.searchParams.get("voice") || "").toLowerCase();
  if (!VALID_VOICES.has(voice)) {
    return new NextResponse(`Unknown voice "${voice}".`, { status: 400 });
  }

  try {
    const speech = await getOpenAI().audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "alloy",
      input: SAMPLE_TEXT,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        // Cache aggressively in the browser — sample never changes per voice.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("voice-preview failed:", err);
    return new NextResponse("Could not generate sample.", { status: 500 });
  }
}
