"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { titleCase } from "@/lib/utils";
import { createViolation } from "@/app/admin/(panel)/violations/actions";
import type { ViolationType, ViolationStatus } from "@/lib/types/database";

const TYPES: ViolationType[] = [
  "toll", "parking", "speeding", "red_light", "citation", "impound", "other",
];
const STATUSES: ViolationStatus[] = [
  "unpaid", "paid", "charged_to_customer", "disputed", "waived",
];

const EMPTY = {
  vehicle_id: "",
  violation_type: "toll" as ViolationType,
  description: "",
  location: "",
  amount: "",
  incurred_date: new Date().toISOString().slice(0, 10),
  status: "unpaid" as ViolationStatus,
  charged_to_customer: false,
  reference_number: "",
};

export function ViolationForm({
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
      const res = await createViolation({
        vehicle_id: form.vehicle_id,
        violation_type: form.violation_type,
        description: form.description,
        location: form.location,
        amount: Number(form.amount) || 0,
        incurred_date: form.incurred_date,
        status: form.status,
        charged_to_customer: form.charged_to_customer,
        reference_number: form.reference_number,
      });
      if (res.ok) {
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save the record.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Toll / Violation
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Toll or Violation"
        description="Record a toll, ticket or citation against a vehicle."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save Record</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle">
              <Select value={form.vehicle_id}
                onChange={(e) => set("vehicle_id", e.target.value)}>
                <option value="">Select a vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.violation_type}
                onChange={(e) => set("violation_type", e.target.value as ViolationType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)" required>
              <Input type="number" step="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} />
            </Field>
            <Field label="Date Incurred">
              <Input type="date" value={form.incurred_date}
                onChange={(e) => set("incurred_date", e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status}
                onChange={(e) => set("status", e.target.value as ViolationStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reference #">
              <Input value={form.reference_number}
                onChange={(e) => set("reference_number", e.target.value)} />
            </Field>
          </div>
          <Field label="Location">
            <Input value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. I-405 Toll Plaza" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description}
              onChange={(e) => set("description", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-3">
            <input type="checkbox" checked={form.charged_to_customer}
              onChange={(e) => set("charged_to_customer", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
            <span className="text-sm text-slate-700">Charge this to the customer</span>
          </label>
        </div>
      </Modal>
    </>
  );
}
