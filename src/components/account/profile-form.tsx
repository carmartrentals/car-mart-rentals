"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { updateMyProfile } from "@/app/account/(portal)/actions";

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
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {saved && <Alert tone="success">Your profile has been updated.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" required>
              <Input
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Street Address">
            <Input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </Field>
            <Field label="ZIP">
              <Input
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
        </CardBody>
      </Card>

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
    <Card>
      <CardHeader><CardTitle>Password</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Your password has been changed.</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm New Password">
            <Input
              type="password"
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
      </CardBody>
    </Card>
  );
}
