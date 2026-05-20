"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
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
      <div className="flex flex-col items-center rounded-xl border border-slate-200 p-8 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Message Sent
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Thank you for reaching out. Our team will get back to you shortly.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setSent(false)}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-6 shadow-card">
      <h2 className="text-lg font-semibold text-slate-900">Send a Message</h2>
      <div className="mt-4 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
        </div>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="How can we help?" required>
          <Textarea
            rows={4}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Tell us about your rental needs..."
          />
        </Field>
        <Button onClick={submit} loading={pending} className="w-full">
          <Send className="h-4 w-4" /> Send Message
        </Button>
        <p className="text-center text-xs text-slate-400">
          Or call us directly for the fastest response.
        </p>
      </div>
    </div>
  );
}
