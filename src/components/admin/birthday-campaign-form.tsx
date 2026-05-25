"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, Cake } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveBirthdayCampaign } from "@/app/admin/(panel)/settings/actions";
import type { BirthdayCampaignSettings } from "@/lib/data/settings";

export function BirthdayCampaignForm({
  initial,
}: {
  initial: BirthdayCampaignSettings;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveBirthdayCampaign(v);
      if (res.ok) {
        setResult({ ok: true, msg: "Birthday campaign saved." });
        router.refresh();
      } else {
        setResult({
          ok: false,
          msg: res.error ?? "Could not save birthday campaign.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Cake className="h-4 w-4 text-gold-600" />
            Birthday Campaign
          </span>
        </CardTitle>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            v.enabled
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {v.enabled ? "Active" : "Disabled"}
        </span>
      </CardHeader>
      <CardBody className="space-y-4">
        {result && (
          <Alert tone={result.ok ? "success" : "error"}>
            {result.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}
            {result.msg}
          </Alert>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={v.enabled}
            onChange={(e) => setV({ ...v, enabled: e.target.checked })}
            className="h-4 w-4 accent-gold-500"
          />
          Send birthday emails automatically
        </label>

        <p className="text-xs text-slate-500">
          Sends a branded discount email to each customer ahead of their
          birthday, once per year. Requires a date of birth on the customer
          record (auto-extracted from the AI license check on first upload).
        </p>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            When to send the email
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={v.lead_amount}
              onChange={(e) =>
                setV({ ...v, lead_amount: Number(e.target.value) })
              }
              className="w-24"
            />
            <Select
              value={v.lead_unit}
              onChange={(e) =>
                setV({
                  ...v,
                  lead_unit: e.target.value as "days" | "weeks" | "months",
                })
              }
              className="flex-1"
            >
              <option value="days">days before birthday</option>
              <option value="weeks">weeks before birthday</option>
              <option value="months">months before birthday</option>
            </Select>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            <strong>{v.lead_amount}</strong> {v.lead_unit} before each
            customer&apos;s birthday — gives them time to plan a rental for
            their birthday weekend.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Discount %"
            hint="Shown in the email and matched to the promo code below."
          >
            <Input
              type="number"
              min="0"
              max="100"
              value={v.discount_percent}
              onChange={(e) =>
                setV({ ...v, discount_percent: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Promo code"
            hint="Featured in the email. Create the matching code in /admin/promo-codes."
          >
            <Input
              value={v.promo_code}
              onChange={(e) =>
                setV({ ...v, promo_code: e.target.value.toUpperCase() })
              }
              placeholder="BIRTHDAY15"
            />
          </Field>
        </div>

        <Field
          label="Subject line"
          hint="Supports {{first_name}}."
        >
          <Input
            value={v.subject_template}
            onChange={(e) => setV({ ...v, subject_template: e.target.value })}
          />
        </Field>

        <Field
          label="Email intro"
          hint="Supports {{first_name}} and {{discount_percent}}. Promo code + discount appear automatically below this text."
        >
          <Textarea
            rows={4}
            value={v.intro_template}
            onChange={(e) => setV({ ...v, intro_template: e.target.value })}
          />
        </Field>

        <div className="flex justify-end">
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Birthday Settings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
