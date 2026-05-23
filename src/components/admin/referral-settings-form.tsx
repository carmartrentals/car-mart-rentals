"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { initialActionState } from "@/lib/form";
import { saveReferralSettings } from "@/app/admin/(panel)/referrals/actions";
import type { ReferralProgram } from "@/lib/referral";

export function ReferralSettingsForm({ initial }: { initial: ReferralProgram }) {
  const [state, formAction, pending] = useActionState(
    saveReferralSettings,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Settings saved.</Alert>}

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial.enabled}
          className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
        />
        <span className="text-sm text-slate-700">
          Program is active — customers can see and share their code
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Reward amount ($)"
          hint="The credit value each side receives"
        >
          <Input
            type="number"
            step="0.01"
            min="0"
            name="reward_amount"
            defaultValue={initial.reward_amount}
          />
        </Field>
        <Field
          label="Reward label"
          hint="What customers see — e.g. “$25 off” or “One free day”"
        >
          <Input
            name="reward_label"
            defaultValue={initial.reward_label}
            placeholder="$25 off"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </form>
  );
}
