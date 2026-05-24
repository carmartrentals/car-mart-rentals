"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { submitInsuranceIntake } from "@/app/(site)/insurance-replacement/actions";
import { trackEvent } from "@/lib/analytics";

const EMPTY = {
  contactName: "",
  companyName: "",
  role: "Body shop",
  email: "",
  phone: "",
  driverName: "",
  driverPhone: "",
  insuranceCompany: "",
  claimNumber: "",
  adjusterName: "",
  vehicleClass: "",
  startDate: "",
  duration: "",
  notes: "",
};

export function InsuranceIntakeForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitInsuranceIntake(form);
      if (res.ok) {
        trackEvent("insurance_intake_submitted", {
          role: form.role,
          has_claim: form.claimNumber ? "yes" : "no",
        });
        setSent(true);
        setForm(EMPTY);
      } else {
        setError(res.error ?? "Could not submit your request.");
      }
    });
  }

  if (sent) {
    return (
      <div className="glass flex flex-col items-center rounded-2xl p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-white">Request Sent</h2>
        <p className="mt-1 text-sm text-slate-400">
          Thank you — our team will review the details and contact you shortly
          to arrange the replacement vehicle.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-5 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <Section title="Your Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your Name" required>
            <input
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Contact name"
              className="ii-input"
            />
          </Field>
          <Field label="Your Role">
            <select
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="ii-input"
            >
              <option>Body shop</option>
              <option>Insurance adjuster</option>
              <option>Insurance company</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Company / Shop Name">
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="e.g. Valley Collision Center"
              className="ii-input"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(555) 123-4567"
              className="ii-input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              className="ii-input"
            />
          </Field>
        </div>
      </Section>

      <Section title="The Driver">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Driver's Name" required>
            <input
              value={form.driverName}
              onChange={(e) => set("driverName", e.target.value)}
              placeholder="Customer who needs the car"
              className="ii-input"
            />
          </Field>
          <Field label="Driver's Phone">
            <input
              value={form.driverPhone}
              onChange={(e) => set("driverPhone", e.target.value)}
              placeholder="(555) 123-4567"
              className="ii-input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Claim & Rental Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Insurance Company">
            <input
              value={form.insuranceCompany}
              onChange={(e) => set("insuranceCompany", e.target.value)}
              placeholder="e.g. State Farm"
              className="ii-input"
            />
          </Field>
          <Field label="Claim Number">
            <input
              value={form.claimNumber}
              onChange={(e) => set("claimNumber", e.target.value)}
              className="ii-input"
            />
          </Field>
          <Field label="Adjuster Name">
            <input
              value={form.adjusterName}
              onChange={(e) => set("adjusterName", e.target.value)}
              className="ii-input"
            />
          </Field>
          <Field label="Vehicle Class Needed">
            <input
              value={form.vehicleClass}
              onChange={(e) => set("vehicleClass", e.target.value)}
              placeholder="e.g. midsize SUV, sedan"
              className="ii-input"
            />
          </Field>
          <Field label="Estimated Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className="ii-input"
            />
          </Field>
          <Field label="Estimated Duration">
            <input
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="e.g. 2 weeks"
              className="ii-input"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything else we should know..."
            className="ii-input"
          />
        </Field>
      </Section>

      <button
        onClick={submit}
        disabled={pending}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Submit Replacement Request
      </button>

      <style>{`
        .ii-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 12, 17, 0.6);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #ffffff;
          color-scheme: dark;
        }
        .ii-input::placeholder { color: #64748b; }
        .ii-input:focus {
          outline: none;
          border-color: #cbced4;
          box-shadow: 0 0 0 2px rgba(203, 206, 212, 0.25);
        }
        .ii-input option { background: #14151c; color: #ffffff; }
      `}</style>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-300">
        {title}
      </h3>
      {children}
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
