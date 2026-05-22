"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, FileWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { saveClaim } from "@/app/admin/(panel)/claims/actions";
import type { ClaimStatus, InsuranceClaim } from "@/lib/types/database";

type Row = InsuranceClaim & {
  customer: { first_name: string; last_name: string } | null;
};

const STATUSES: ClaimStatus[] = [
  "open", "authorized", "in_progress", "billed", "paid", "closed", "denied",
];
const TONE: Record<ClaimStatus, "gray" | "blue" | "amber" | "green" | "red"> = {
  open: "gray",
  authorized: "blue",
  in_progress: "amber",
  billed: "amber",
  paid: "green",
  closed: "green",
  denied: "red",
};

const EMPTY = {
  claim_number: "", customer_id: "", reservation_id: "", insurance_company: "",
  adjuster_name: "", adjuster_email: "", adjuster_phone: "",
  status: "open" as ClaimStatus, authorized_amount: "", deductible: "",
  claim_date: "", notes: "",
};

export function ClaimManager({
  claims,
  customers,
  reservations,
}: {
  claims: Row[];
  customers: { id: string; label: string }[];
  reservations: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openNew() {
    setError(null);
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(c: Row) {
    setError(null);
    setEditId(c.id);
    setForm({
      claim_number: c.claim_number,
      customer_id: c.customer_id ?? "",
      reservation_id: c.reservation_id ?? "",
      insurance_company: c.insurance_company ?? "",
      adjuster_name: c.adjuster_name ?? "",
      adjuster_email: c.adjuster_email ?? "",
      adjuster_phone: c.adjuster_phone ?? "",
      status: c.status,
      authorized_amount: String(c.authorized_amount || ""),
      deductible: String(c.deductible || ""),
      claim_date: c.claim_date ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }
  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveClaim({
        id: editId ?? undefined,
        ...form,
        authorized_amount: Number(form.authorized_amount) || 0,
        deductible: Number(form.deductible) || 0,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {claims.length} claim(s)
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Claim
        </Button>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title="No insurance claims"
          description="Track claim-based and body-shop replacement rentals here."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Claim #</TH>
              <TH>Customer</TH>
              <TH>Insurer</TH>
              <TH>Adjuster</TH>
              <TH className="text-right">Authorized</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {claims.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-800">{c.claim_number}</TD>
                <TD className="text-slate-600">
                  {c.customer
                    ? `${c.customer.first_name} ${c.customer.last_name}`
                    : "—"}
                </TD>
                <TD className="text-slate-600">{c.insurance_company || "—"}</TD>
                <TD className="text-slate-500">{c.adjuster_name || "—"}</TD>
                <TD className="text-right font-medium">
                  {formatCurrency(c.authorized_amount)}
                </TD>
                <TD>
                  <Badge tone={TONE[c.status]}>{titleCase(c.status)}</Badge>
                </TD>
                <TD className="text-right">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Claim" : "New Insurance Claim"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save Claim</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Claim Number" required>
              <Input value={form.claim_number}
                onChange={(e) => set("claim_number", e.target.value)} />
            </Field>
            <Field label="Customer">
              <Select value={form.customer_id}
                onChange={(e) => set("customer_id", e.target.value)}>
                <option value="">Not linked</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reservation">
              <Select value={form.reservation_id}
                onChange={(e) => set("reservation_id", e.target.value)}>
                <option value="">Not linked</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Insurance Company">
              <Input value={form.insurance_company}
                onChange={(e) => set("insurance_company", e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status}
                onChange={(e) => set("status", e.target.value as ClaimStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Adjuster Name">
              <Input value={form.adjuster_name}
                onChange={(e) => set("adjuster_name", e.target.value)} />
            </Field>
            <Field label="Adjuster Phone">
              <Input value={form.adjuster_phone}
                onChange={(e) => set("adjuster_phone", e.target.value)} />
            </Field>
            <Field label="Adjuster Email">
              <Input value={form.adjuster_email}
                onChange={(e) => set("adjuster_email", e.target.value)} />
            </Field>
            <Field label="Claim Date">
              <Input type="date" value={form.claim_date}
                onChange={(e) => set("claim_date", e.target.value)} />
            </Field>
            <Field label="Authorized Amount ($)">
              <Input type="number" step="0.01" value={form.authorized_amount}
                onChange={(e) => set("authorized_amount", e.target.value)} />
            </Field>
            <Field label="Deductible ($)">
              <Input type="number" step="0.01" value={form.deductible}
                onChange={(e) => set("deductible", e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes}
              onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
