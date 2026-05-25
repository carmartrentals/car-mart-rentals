"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle2,
  Phone,
  Sparkles,
  Play,
  Loader2,
  Square,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveAiVoiceSettings } from "@/app/admin/(panel)/settings/actions";

interface VoiceValue {
  mode: "polly" | "realtime";
  voice: string;
  realtime_voice: string;
}

const POLLY_VOICES = [
  { value: "Polly.Joanna-Neural", label: "Joanna (US female · classic IVR)" },
  { value: "Polly.Danielle-Neural", label: "Danielle (US female · warm)" },
  { value: "Polly.Ruth-Neural", label: "Ruth (US female · younger)" },
  { value: "Polly.Kendra-Neural", label: "Kendra (US female · calm)" },
  { value: "Polly.Matthew-Neural", label: "Matthew (US male · concierge)" },
  { value: "Polly.Stephen-Neural", label: "Stephen (US male · authoritative)" },
  { value: "Polly.Gregory-Neural", label: "Gregory (US male · deep)" },
  { value: "Polly.Amy-Neural", label: "Amy (British female · polished)" },
  { value: "Polly.Brian-Neural", label: "Brian (British male · classy)" },
  { value: "Polly.Olivia-Neural", label: "Olivia (Australian female · warm)" },
];

const REALTIME_VOICES = [
  { value: "coral", label: "Coral (female · warm, recommended)" },
  { value: "shimmer", label: "Shimmer (female · bright)" },
  { value: "nova", label: "Nova (female · energetic)" },
  { value: "alloy", label: "Alloy (neutral)" },
  { value: "verse", label: "Verse (neutral · expressive)" },
  { value: "ash", label: "Ash (male · grounded)" },
  { value: "ballad", label: "Ballad (male · smooth)" },
  { value: "sage", label: "Sage (male · calm)" },
  { value: "echo", label: "Echo (male · professional)" },
  { value: "onyx", label: "Onyx (male · deep)" },
];

export function AiVoiceSettingsForm({ initial }: { initial: VoiceValue }) {
  const router = useRouter();
  const [v, setV] = useState<VoiceValue>(initial);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Preview-audio plumbing. One <Audio> element is reused for every voice
  // sample so playing a new sample interrupts the previous one cleanly.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPreviewing(null);
  }

  async function playRealtimePreview(voice: string) {
    if (previewing === voice) {
      stopPreview();
      return;
    }
    setPreviewError(null);
    stopPreview();
    setPreviewing(voice);
    try {
      const audio = new Audio(
        `/api/admin/voice-preview?voice=${encodeURIComponent(voice)}`,
      );
      audioRef.current = audio;
      audio.onended = () => setPreviewing(null);
      audio.onerror = () => {
        setPreviewing(null);
        setPreviewError(
          "Could not load the sample. Make sure OPENAI_API_KEY is set on Vercel.",
        );
      };
      await audio.play();
    } catch {
      setPreviewing(null);
      setPreviewError("Browser blocked autoplay — click the play button again.");
    }
  }

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveAiVoiceSettings({
        mode: v.mode,
        voice: v.voice,
        realtime_voice: v.realtime_voice,
      });
      if (res.ok) {
        setResult({ ok: true, msg: "Voice settings saved." });
        router.refresh();
      } else {
        setResult({
          ok: false,
          msg: res.error ?? "Could not save voice settings.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 text-gold-600" />
            AI Receptionist Voice
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {result && (
          <Alert tone={result.ok ? "success" : "error"}>
            {result.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}
            {result.msg}
          </Alert>
        )}

        <Field
          label="Voice Mode"
          hint="Realtime sounds nearly human but requires the bridge service deployed. Polly is the legacy stack."
        >
          <Select
            value={v.mode}
            onChange={(e) =>
              setV({ ...v, mode: e.target.value as "polly" | "realtime" })
            }
          >
            <option value="polly">Polly (legacy — Twilio TTS + chat)</option>
            <option value="realtime">
              Realtime (recommended — OpenAI Realtime via bridge)
            </option>
          </Select>
        </Field>

        {v.mode === "realtime" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Realtime requires the bridge service.
            </p>
            <p className="mt-1">
              Deploy <code>services/twilio-bridge/</code> to Render or Fly.io,
              then set <code>TWILIO_BRIDGE_WSS_URL</code> and{" "}
              <code>BRIDGE_SECRET</code> on Vercel. If the bridge URL isn&apos;t
              set, calls automatically fall back to Polly so the phone line
              keeps working.
            </p>
          </div>
        )}

        <Field
          label="Polly Voice"
          hint="Used when mode = Polly. Free, included in the Twilio voice rate. Polly voices are synthesized by Amazon at call time — to preview, save the setting and call your number."
        >
          <Select
            value={v.voice}
            onChange={(e) => setV({ ...v, voice: e.target.value })}
          >
            {POLLY_VOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Realtime Voice"
          hint="Used when mode = Realtime. OpenAI's most human-sounding voices. Tap play to hear a sample before saving."
        >
          <div className="flex items-stretch gap-2">
            <div className="flex-1">
              <Select
                value={v.realtime_voice}
                onChange={(e) =>
                  setV({ ...v, realtime_voice: e.target.value })
                }
              >
                {REALTIME_VOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              onClick={() => playRealtimePreview(v.realtime_voice)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              aria-label={
                previewing === v.realtime_voice
                  ? "Stop preview"
                  : "Play voice sample"
              }
            >
              {previewing === v.realtime_voice ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Preview
                </>
              )}
            </button>
          </div>
          {previewError && (
            <p className="mt-2 text-xs text-rose-600">{previewError}</p>
          )}
        </Field>

        {/* Quick-scan voice grid — one play button per Realtime voice so
            the operator can A/B every option without re-picking from the
            dropdown each time. */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Compare All Realtime Voices
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {REALTIME_VOICES.map((opt) => {
              const active = previewing === opt.value;
              const selected = v.realtime_voice === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => playRealtimePreview(opt.value)}
                  className={`flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-gold-500 bg-gold-50 text-gold-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title={opt.label}
                >
                  <span className="truncate capitalize">{opt.value}</span>
                  {active ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Pick a favorite from this grid, then switch the dropdown above
            and save. Sample audio is generated by OpenAI&apos;s TTS using
            the exact same voice as the live call.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Voice Settings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
