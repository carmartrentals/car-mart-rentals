"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { titleCase } from "@/lib/utils";
import { createLead } from "@/app/admin/(panel)/leads/actions";
import type { LeadSource, LeadStatus } from "@/lib/types/database";

const SOURCES: LeadSource[] = [
  "website", "phone", "referral", "walk_in", "social", "other",
];
const STATUSES: LeadStatus[] = [
  "new", "contacted", "quoted", "converted", "lost",
];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  message: "",
  source: "phone" as LeadSource,
  status: "new" as LeadStatus,
  interested_vehicle_id: "",
};

export function LeadForm({
  vehicles,
}: {
  vehicles: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createLead({
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: form.source,
        status: form.status,
        interested_vehicle_id: form.interested_vehicle_id,
      });
      if (res.ok) {
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save the lead.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Lead
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Sales Lead"
        description="Capture a prospective customer or inquiry."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save Lead</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Name" required>
            <Input value={form.name}
              onChange={(e) => set("name", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input type="email" value={form.email}
                onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Source">
              <Select value={form.source}
                onChange={(e) => set("source", e.target.value as LeadSource)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status}
                onChange={(e) => set("status", e.target.value as LeadStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Interested Vehicle (optional)">
            <Select value={form.interested_vehicle_id}
              onChange={(e) => set("interested_vehicle_id", e.target.value)}>
              <option value="">None specified</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Message / Notes">
            <Textarea value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="What is the customer looking for?" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
