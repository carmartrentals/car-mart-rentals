"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { createDamage } from "@/app/admin/(panel)/damages/actions";
import type { DamageSeverity, RepairStatus } from "@/lib/types/database";

const EMPTY = {
  vehicle_id: "",
  location: "",
  description: "",
  severity: "minor" as DamageSeverity,
  repair_status: "reported" as RepairStatus,
  estimated_cost: "",
  charged_to_customer: false,
  charge_amount: "",
};

export function DamageForm({
  vehicles,
}: {
  vehicles: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createDamage(form);
      if (res.ok) {
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save the damage record.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Log Damage
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log Vehicle Damage"
        description="Record damage found outside of a check-in inspection."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              Save Damage
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Field label="Vehicle" required>
            <Select
              value={form.vehicle_id}
              onChange={(e) => set("vehicle_id", e.target.value)}
            >
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location" required>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Front bumper, left side"
              />
            </Field>
            <Field label="Severity">
              <Select
                value={form.severity}
                onChange={(e) => set("severity", e.target.value as DamageSeverity)}
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the damage..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repair Status">
              <Select
                value={form.repair_status}
                onChange={(e) => set("repair_status", e.target.value as RepairStatus)}
              >
                <option value="reported">Reported</option>
                <option value="in_repair">In Repair</option>
                <option value="repaired">Repaired</option>
                <option value="not_repaired">Not Repaired</option>
              </Select>
            </Field>
            <Field label="Estimated Repair Cost ($)">
              <Input
                type="number"
                step="0.01"
                value={form.estimated_cost}
                onChange={(e) => set("estimated_cost", e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={form.charged_to_customer}
              onChange={(e) => set("charged_to_customer", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
            />
            <span className="text-sm text-slate-700">Charge this damage to the customer</span>
          </label>

          {form.charged_to_customer && (
            <Field label="Amount Charged to Customer ($)">
              <Input
                type="number"
                step="0.01"
                value={form.charge_amount}
                onChange={(e) => set("charge_amount", e.target.value)}
              />
            </Field>
          )}
        </div>
      </Modal>
    </>
  );
}
