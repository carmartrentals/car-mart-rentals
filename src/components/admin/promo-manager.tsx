"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Tag, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  savePromoCode,
  togglePromoCode,
  deletePromoCode,
} from "@/app/admin/(panel)/promo-codes/actions";
import type { PromoCode, DiscountType } from "@/lib/types/database";

const EMPTY = {
  code: "",
  description: "",
  discount_type: "percentage" as DiscountType,
  discount_value: "10",
  min_rental_days: "1",
  max_uses: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export function PromoManager({ codes }: { codes: PromoCode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openNew() {
    setError(null);
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(c: PromoCode) {
    setError(null);
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_rental_days: String(c.min_rental_days),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      valid_from: c.valid_from ?? "",
      valid_until: c.valid_until ?? "",
      is_active: c.is_active,
    });
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await savePromoCode({
        id: editId ?? undefined,
        code: form.code,
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        min_rental_days: Number(form.min_rental_days) || 1,
        max_uses: form.max_uses,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        is_active: form.is_active,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }

  function toggle(c: PromoCode) {
    startTransition(async () => {
      await togglePromoCode(c.id, !c.is_active);
      router.refresh();
    });
  }

  function confirmDelete(c: PromoCode) {
    setDeleteError(null);
    if (
      !window.confirm(
        `Delete promo code ${c.code}? This permanently removes it from the database.`,
      )
    ) {
      return;
    }
    setDeletingId(c.id);
    startTransition(async () => {
      const res = await deletePromoCode(c.id);
      setDeletingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setDeleteError(res.error ?? "Could not delete the promo code.");
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {codes.length} promo code(s)
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Promo Code
        </Button>
      </div>

      {deleteError && (
        <div className="border-b border-slate-100 px-5 py-3">
          <Alert tone="error">{deleteError}</Alert>
        </div>
      )}

      {codes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No promo codes"
          description="Create discount codes customers can apply to their reservations."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Discount</TH>
              <TH>Min Days</TH>
              <TH>Uses</TH>
              <TH>Valid Until</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {codes.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono font-semibold text-slate-800">{c.code}</TD>
                <TD>
                  {c.discount_type === "percentage"
                    ? `${c.discount_value}%`
                    : formatCurrency(c.discount_value)}
                </TD>
                <TD className="text-slate-500">{c.min_rental_days}</TD>
                <TD className="text-slate-500">
                  {c.times_used}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </TD>
                <TD className="text-slate-500">
                  {c.valid_until ? formatDate(c.valid_until) : "—"}
                </TD>
                <TD>
                  <button onClick={() => toggle(c)} disabled={pending}>
                    <Badge tone={c.is_active ? "green" : "gray"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                      title="Edit promo code"
                      aria-label="Edit promo code"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(c)}
                      disabled={pending && deletingId === c.id}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title={
                        c.times_used > 0
                          ? "Code has been used — deactivate instead of deleting"
                          : "Delete promo code"
                      }
                      aria-label="Delete promo code"
                    >
                      {pending && deletingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Promo Code" : "New Promo Code"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Code" required hint="Customers enter this at checkout">
            <Input
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="SUMMER25"
              className="font-mono"
            />
          </Field>
          <Field label="Description">
            <Textarea value={form.description}
              onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Type">
              <Select value={form.discount_type}
                onChange={(e) => set("discount_type", e.target.value as DiscountType)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </Select>
            </Field>
            <Field label="Discount Value">
              <Input type="number" step="0.01" value={form.discount_value}
                onChange={(e) => set("discount_value", e.target.value)} />
            </Field>
            <Field label="Min Rental Days">
              <Input type="number" value={form.min_rental_days}
                onChange={(e) => set("min_rental_days", e.target.value)} />
            </Field>
            <Field label="Max Uses (blank = unlimited)">
              <Input type="number" value={form.max_uses}
                onChange={(e) => set("max_uses", e.target.value)} />
            </Field>
            <Field label="Valid From">
              <Input type="date" value={form.valid_from}
                onChange={(e) => set("valid_from", e.target.value)} />
            </Field>
            <Field label="Valid Until">
              <Input type="date" value={form.valid_until}
                onChange={(e) => set("valid_until", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
            Active &amp; usable
          </label>
        </div>
      </Modal>
    </Card>
  );
}
