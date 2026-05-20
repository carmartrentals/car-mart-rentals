"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { titleCase } from "@/lib/utils";
import { createExpense } from "@/app/admin/(panel)/expenses/actions";
import type { ExpenseCategory, PaymentMethod } from "@/lib/types/database";

const CATEGORIES: ExpenseCategory[] = [
  "fuel", "maintenance", "repairs", "insurance", "registration", "cleaning",
  "marketing", "supplies", "payroll", "rent", "utilities", "software", "other",
];
const METHODS: PaymentMethod[] = ["card", "cash", "bank_transfer", "other"];

const EMPTY = {
  category: "fuel" as ExpenseCategory,
  description: "",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  vehicle_id: "",
  odometer: "",
  vendor: "",
  payment_method: "card" as PaymentMethod,
  notes: "",
};

export function ExpenseForm({
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
      const res = await createExpense({
        category: form.category,
        description: form.description,
        amount: Number(form.amount) || 0,
        expense_date: form.expense_date,
        vehicle_id: form.vehicle_id,
        odometer: form.odometer,
        vendor: form.vendor,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      if (res.ok) {
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save the expense.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Record Expense
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record Expense"
        description="Log a business cost — fuel, maintenance, overhead and more."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save Expense</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category}
                onChange={(e) => set("category", e.target.value as ExpenseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{titleCase(c)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount ($)" required>
              <Input type="number" step="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} />
            </Field>
          </div>
          <Field label="Description" required>
            <Input value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Premium fuel — AMG GLE" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.expense_date}
                onChange={(e) => set("expense_date", e.target.value)} />
            </Field>
            <Field label="Payment Method">
              <Select value={form.payment_method}
                onChange={(e) => set("payment_method", e.target.value as PaymentMethod)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{titleCase(m)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle (optional)">
              <Select value={form.vehicle_id}
                onChange={(e) => set("vehicle_id", e.target.value)}>
                <option value="">Not vehicle-specific</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Odometer (optional)">
              <Input type="number" value={form.odometer}
                onChange={(e) => set("odometer", e.target.value)} />
            </Field>
          </div>
          <Field label="Vendor">
            <Input value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="Who was paid" />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes}
              onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
