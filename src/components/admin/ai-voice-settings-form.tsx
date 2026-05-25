"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, Phone, Sparkles } from "lucide-react";
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
          hint="Used when mode = Polly. Free, included in the Twilio voice rate."
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
          hint="Used when mode = Realtime. OpenAI's most human-sounding voices."
        >
          <Select
            value={v.realtime_voice}
            onChange={(e) => setV({ ...v, realtime_voice: e.target.value })}
          >
            {REALTIME_VOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end">
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Voice Settings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
