"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { saveOnboardingProfile } from "@/app/account/(portal)/onboarding/actions";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function OnboardingForm({
  initial,
  hasFront,
  hasBack,
  nextUrl,
}: {
  initial: {
    phone: string;
    date_of_birth: string;
    dl_number: string;
    dl_state: string;
    dl_expiration: string;
  };
  hasFront: boolean;
  hasBack: boolean;
  nextUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = hasFront; // hard requirement: at least the front photo

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save() {
    if (!ready) {
      setError("Please upload at least the front of your driver license.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingProfile(form);
      if (res.ok) router.push(nextUrl);
      else setError(res.error ?? "Could not save your profile.");
    });
  }

  return (
    <div className="glass mt-6 rounded-2xl p-6">
      {/* Status: photo upload checklist */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <ChecklistItem label="License photo (front)" done={hasFront} required />
        <ChecklistItem label="License photo (back)" done={hasBack} />
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-gold-300">
        Your details
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        These help us verify your booking faster. All optional except the
        license photo above — type whatever you can; we&apos;ll confirm at pickup.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(818) 555-0142"
            className="ob-input"
          />
        </Field>
        <Field label="Date of birth">
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
            className="ob-input"
          />
        </Field>
        <Field label="Driver license number">
          <input
            value={form.dl_number}
            onChange={(e) => set("dl_number", e.target.value)}
            placeholder="A1234567"
            className="ob-input"
          />
        </Field>
        <Field label="License state">
          <select
            value={form.dl_state}
            onChange={(e) => set("dl_state", e.target.value)}
            className="ob-input"
          >
            <option value="">Select…</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="License expiration">
          <input
            type="date"
            value={form.dl_expiration}
            onChange={(e) => set("dl_expiration", e.target.value)}
            className="ob-input"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {ready
            ? "Looks good — click below to continue."
            : "Upload at least the front photo of your license to continue."}
        </p>
        <button
          onClick={save}
          disabled={pending || !ready}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Continue
        </button>
      </div>

      <style>{`
        .ob-input {
          width: 100%;
          height: 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 12, 17, 0.6);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #ffffff;
          color-scheme: dark;
        }
        .ob-input::placeholder { color: #64748b; }
        .ob-input:focus {
          outline: none;
          border-color: #cbced4;
          box-shadow: 0 0 0 2px rgba(203, 206, 212, 0.25);
        }
        .ob-input option { background: #14151c; color: #ffffff; }
      `}</style>
    </div>
  );
}

function ChecklistItem({
  label,
  done,
  required,
}: {
  label: string;
  done: boolean;
  required?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : required
            ? "border-rose-500/30 bg-rose-500/5 text-rose-200"
            : "border-white/10 bg-white/[0.03] text-slate-400"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
          {required ? "!" : "—"}
        </span>
      )}
      <span className="truncate">{label}</span>
      {required && !done && (
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide">
          Required
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
