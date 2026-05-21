"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateMyProfile } from "@/app/account/(portal)/actions";

const INPUT =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm " +
  "text-white placeholder:text-slate-500 focus:border-gold-400 focus:outline-none " +
  "focus:ring-2 focus:ring-gold-400/25";

interface ProfileValues {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProfileValues>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateMyProfile(form);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save your changes.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Panel title="Personal Information">
        {error && <DarkAlert tone="error">{error}</DarkAlert>}
        {saved && (
          <DarkAlert tone="success">Your profile has been updated.</DarkAlert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required>
            <input
              className={INPUT}
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </Field>
          <Field label="Last Name" required>
            <input
              className={INPUT}
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className={INPUT}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={INPUT}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Street Address">
          <input
            className={INPUT}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City">
            <input
              className={INPUT}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="State">
            <input
              className={INPUT}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </Field>
          <Field label="ZIP">
            <input
              className={INPUT}
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
            />
          </Field>
        </div>
        <div>
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </Panel>

      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function changePassword() {
    setError(null);
    setSaved(false);
    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        setSaved(true);
        setPassword("");
        setConfirm("");
      }
    });
  }

  return (
    <Panel title="Password">
      {error && <DarkAlert tone="error">{error}</DarkAlert>}
      {saved && (
        <DarkAlert tone="success">Your password has been changed.</DarkAlert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New Password">
          <input
            type="password"
            className={INPUT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm New Password">
          <input
            type="password"
            className={INPUT}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </div>
      <div>
        <Button onClick={changePassword} loading={pending}>
          <Lock className="h-4 w-4" /> Update Password
        </Button>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-4 p-5">{children}</div>
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

function DarkAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    tone === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
