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

// Voices the preview supports. Includes both the GA Realtime-only voices
// (marin, cedar) and the cross-product voices (coral, ash, ballad, sage,
// shimmer, verse). For the Realtime-only voices we have to use a similar-
// sounding TTS voice as the preview fallback since TTS doesn't expose
// marin/cedar yet — see PREVIEW_TTS_MAP below.
const VALID_VOICES = new Set([
  "marin",
  "cedar",
  "coral",
  "ash",
  "ballad",
  "sage",
  "shimmer",
  "verse",
]);

// Marin and Cedar are exclusive to the GA Realtime API and aren't exposed
// through gpt-4o-mini-tts. Map them to the closest-sounding TTS voice so
// the operator gets a reasonable preview. (The live call will still use
// the actual Marin/Cedar voice — only the preview is approximate.)
const PREVIEW_TTS_MAP: Record<string, string> = {
  marin: "coral",
  cedar: "ash",
};

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

  // Marin/Cedar aren't on TTS — use the closest sound-alike for the preview.
  const ttsVoice = PREVIEW_TTS_MAP[voice] ?? voice;

  try {
    const speech = await getOpenAI().audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: ttsVoice as "alloy",
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
