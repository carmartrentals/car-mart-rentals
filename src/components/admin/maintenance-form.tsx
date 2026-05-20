"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { titleCase } from "@/lib/utils";
import { createMaintenanceRecord } from "@/app/admin/(panel)/maintenance/actions";
import type { MaintenanceType, MaintenanceStatus } from "@/lib/types/database";

const TYPES: MaintenanceType[] = [
  "oil_change", "tire_rotation", "tires", "brakes", "registration",
  "insurance", "inspection", "detailing", "repair", "other",
];
const STATUSES: MaintenanceStatus[] = [
  "scheduled", "in_progress", "completed", "overdue", "cancelled",
];

const EMPTY = {
  vehicle_id: "",
  maintenance_type: "oil_change" as MaintenanceType,
  description: "",
  status: "scheduled" as MaintenanceStatus,
  service_date: "",
  due_date: "",
  due_mileage: "",
  cost: "",
  vendor: "",
  notes: "",
};

export function MaintenanceForm({
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
      const res = await createMaintenanceRecord(form);
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
        <Plus className="h-4 w-4" /> Add Service Record
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Maintenance Record"
        description="Log a service, repair or scheduled maintenance item."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              Save Record
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
            <Field label="Type">
              <Select
                value={form.maintenance_type}
                onChange={(e) =>
                  set("maintenance_type", e.target.value as MaintenanceType)
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{titleCase(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as MaintenanceStatus)}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{titleCase(st)}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description" required>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Full synthetic oil change & filter"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service Date">
              <Input
                type="date"
                value={form.service_date}
                onChange={(e) => set("service_date", e.target.value)}
              />
            </Field>
            <Field label="Next Due Date">
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </Field>
            <Field label="Next Due Mileage">
              <Input
                type="number"
                value={form.due_mileage}
                onChange={(e) => set("due_mileage", e.target.value)}
                placeholder="e.g. 30000"
              />
            </Field>
            <Field label="Cost ($)">
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Vendor / Shop">
            <Input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="Service provider name"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
