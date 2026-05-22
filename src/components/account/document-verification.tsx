"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, ScanLine, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveMyLicenseInfo,
  saveMyInsuranceInfo,
  startIdentityVerification,
  extractMyLicense,
  extractMyInsurance,
} from "@/app/account/(portal)/actions";

const INPUT =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm " +
  "text-white placeholder:text-slate-500 focus:border-gold-400 focus:outline-none " +
  "focus:ring-2 focus:ring-gold-400/25";

/** Big button that launches an instant Stripe Identity ID check. */
export function IdentityVerifyButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startIdentityVerification();
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error ?? "Could not start verification. Please try again.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ScanLine className="h-4 w-4" />
        )}
        {pending ? "Starting secure check…" : "Verify my license instantly"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

/** Small "auto-fill from photo" button powered by AI document reading. */
function AutofillButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/30 bg-gold-400/[0.07] px-3 py-2 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-400/15 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {pending ? "Reading your photo…" : "Auto-fill from my photo"}
    </button>
  );
}

/** Driver-license detail fields submitted for manual review. */
export function LicenseDetailsForm({
  initial,
  aiEnabled,
}: {
  initial: { dl_number: string; dl_state: string; dl_expiration: string };
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [filling, startFilling] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fillNote, setFillNote] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  function autofill() {
    setError(null);
    setSaved(false);
    setFillNote(null);
    startFilling(async () => {
      const res = await extractMyLicense();
      if (res.ok && res.data) {
        setForm((f) => ({
          dl_number: res.data!.number ?? f.dl_number,
          dl_state: res.data!.state ?? f.dl_state,
          dl_expiration: res.data!.expiration ?? f.dl_expiration,
        }));
        setFillNote("We filled in what we could read — please double-check it.");
      } else {
        setError(res.error ?? "Could not read the photo.");
      }
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("dl_number", form.dl_number);
      fd.set("dl_state", form.dl_state);
      fd.set("dl_expiration", form.dl_expiration);
      const res = await saveMyLicenseInfo(fd);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not submit your details.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {aiEnabled && (
        <AutofillButton onClick={autofill} pending={filling} />
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="License Number" required>
          <input
            className={INPUT}
            value={form.dl_number}
            onChange={(e) => set("dl_number", e.target.value)}
            placeholder="As printed on the license"
          />
        </Field>
        <Field label="Issuing State">
          <input
            className={INPUT}
            value={form.dl_state}
            onChange={(e) => set("dl_state", e.target.value)}
            placeholder="e.g. CA"
          />
        </Field>
        <Field label="Expiration Date" required>
          <input
            type="date"
            className={INPUT}
            value={form.dl_expiration}
            onChange={(e) => set("dl_expiration", e.target.value)}
          />
        </Field>
      </div>
      {fillNote && <p className="text-xs text-gold-300">{fillNote}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Submitted — our team will
          review it shortly.
        </p>
      )}
      <Button onClick={save} loading={pending}>
        <Save className="h-4 w-4" /> Submit License for Review
      </Button>
    </div>
  );
}

/** Insurance detail fields submitted for manual review. */
export function InsuranceDetailsForm({
  initial,
  aiEnabled,
}: {
  initial: {
    insurance_company: string;
    insurance_policy_no: string;
    insurance_expiration: string;
  };
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [filling, startFilling] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fillNote, setFillNote] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  function autofill() {
    setError(null);
    setSaved(false);
    setFillNote(null);
    startFilling(async () => {
      const res = await extractMyInsurance();
      if (res.ok && res.data) {
        setForm((f) => ({
          insurance_company: res.data!.company ?? f.insurance_company,
          insurance_policy_no: res.data!.policyNo ?? f.insurance_policy_no,
          insurance_expiration: res.data!.expiration ?? f.insurance_expiration,
        }));
        setFillNote("We filled in what we could read — please double-check it.");
      } else {
        setError(res.error ?? "Could not read the photo.");
      }
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("insurance_company", form.insurance_company);
      fd.set("insurance_policy_no", form.insurance_policy_no);
      fd.set("insurance_expiration", form.insurance_expiration);
      const res = await saveMyInsuranceInfo(fd);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not submit your details.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {aiEnabled && (
        <AutofillButton onClick={autofill} pending={filling} />
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Insurance Company" required>
          <input
            className={INPUT}
            value={form.insurance_company}
            onChange={(e) => set("insurance_company", e.target.value)}
            placeholder="e.g. State Farm"
          />
        </Field>
        <Field label="Policy Number">
          <input
            className={INPUT}
            value={form.insurance_policy_no}
            onChange={(e) => set("insurance_policy_no", e.target.value)}
          />
        </Field>
        <Field label="Expiration Date">
          <input
            type="date"
            className={INPUT}
            value={form.insurance_expiration}
            onChange={(e) => set("insurance_expiration", e.target.value)}
          />
        </Field>
      </div>
      {fillNote && <p className="text-xs text-gold-300">{fillNote}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Submitted — our team will
          review it shortly.
        </p>
      )}
      <Button onClick={save} loading={pending}>
        <Save className="h-4 w-4" /> Submit Insurance for Review
      </Button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}
