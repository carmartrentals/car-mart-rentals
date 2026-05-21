"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { submitContactForm } from "@/app/(site)/contact/actions";

const EMPTY = { name: "", email: "", phone: "", message: "" };

export function ContactForm() {
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
      const res = await submitContactForm(form);
      if (res.ok) {
        setSent(true);
        setForm(EMPTY);
      } else {
        setError(res.error ?? "Could not send your message.");
      }
    });
  }

  if (sent) {
    return (
      <div className="glass flex flex-col items-center rounded-2xl p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-white">Message Sent</h2>
        <p className="mt-1 text-sm text-slate-400">
          Thank you for reaching out. Our team will get back to you shortly.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-5 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white">Send a Message</h2>
      <div className="mt-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              className="cf-input"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(555) 123-4567"
              className="cf-input"
            />
          </Field>
        </div>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="cf-input"
          />
        </Field>
        <Field label="How can we help?" required>
          <textarea
            rows={4}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Tell us about your rental needs..."
            className="cf-input"
          />
        </Field>
        <button
          onClick={submit}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Message
        </button>
        <p className="text-center text-xs text-slate-500">
          Or call us directly for the fastest response.
        </p>
      </div>

      <style>{`
        .cf-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 12, 17, 0.6);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #ffffff;
          color-scheme: dark;
        }
        .cf-input::placeholder { color: #64748b; }
        .cf-input:focus {
          outline: none;
          border-color: #cbced4;
          box-shadow: 0 0 0 2px rgba(203, 206, 212, 0.25);
        }
      `}</style>
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
