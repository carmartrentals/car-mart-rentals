"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveCancellationPolicy } from "@/app/admin/(panel)/settings/actions";

export function CancellationPolicyForm({
  initial,
}: {
  initial: { window_hours: number; late_fee_percent: number };
}) {
  const router = useRouter();
  const [windowHours, setWindowHours] = useState(String(initial.window_hours));
  const [feePercent, setFeePercent] = useState(
    String(initial.late_fee_percent),
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveCancellationPolicy({
        window_hours: Number(windowHours) || 0,
        late_fee_percent: Number(feePercent) || 0,
      });
      if (res.ok) {
        setResult({ ok: true, msg: "Cancellation policy saved." });
        router.refresh();
      } else {
        setResult({
          ok: false,
          msg: res.error ?? "Could not save policy.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold-600" />
            Cancellation Policy
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {result && (
          <Alert tone={result.ok ? "success" : "error"}>
            {result.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}
            {result.msg}
          </Alert>
        )}
        <p className="text-xs text-slate-500">
          Controls the cancellation copy shown on the booking form, every
          vehicle widget, and the customer portal cancel modal. The late
          fee is informational only — the system does NOT auto-charge it.
          You decide case-by-case from the reservation page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Free-cancellation window (hours before pickup)"
            hint="Customers can cancel for free up to this many hours before pickup."
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={windowHours}
              onChange={(e) => setWindowHours(e.target.value)}
            />
          </Field>
          <Field
            label="Late-cancel fee (% of rental total)"
            hint="Shown to customers as the fee that 'may apply' within the window."
          >
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Policy
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
