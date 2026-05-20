"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { formatCurrency, titleCase } from "@/lib/utils";
import {
  saveAddOn, saveFee, toggleCatalogItem,
} from "@/app/admin/(panel)/settings/actions";
import type { AddOn, Fee, AddonPriceType, FeeType } from "@/lib/types/database";

const EMPTY_ADDON = {
  name: "", description: "", price: "0",
  price_type: "per_rental" as AddonPriceType, is_active: true,
};
const EMPTY_FEE = {
  name: "", description: "", amount: "0",
  fee_type: "fixed" as FeeType, is_taxable: false, is_active: true,
};

export function CatalogManager({
  addOns,
  fees,
}: {
  addOns: AddOn[];
  fees: Fee[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"addon" | "fee" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addon, setAddon] = useState(EMPTY_ADDON);
  const [fee, setFee] = useState(EMPTY_FEE);

  function openAddon(item?: AddOn) {
    setError(null);
    setEditId(item?.id ?? null);
    setAddon(
      item
        ? {
            name: item.name,
            description: item.description ?? "",
            price: String(item.price),
            price_type: item.price_type,
            is_active: item.is_active,
          }
        : EMPTY_ADDON,
    );
    setModal("addon");
  }

  function openFee(item?: Fee) {
    setError(null);
    setEditId(item?.id ?? null);
    setFee(
      item
        ? {
            name: item.name,
            description: item.description ?? "",
            amount: String(item.amount),
            fee_type: item.fee_type,
            is_taxable: item.is_taxable,
            is_active: item.is_active,
          }
        : EMPTY_FEE,
    );
    setModal("fee");
  }

  function done(res: { ok: boolean; error?: string }) {
    if (res.ok) {
      setModal(null);
      router.refresh();
    } else {
      setError(res.error ?? "Could not save.");
    }
  }

  function submitAddon() {
    setError(null);
    startTransition(async () => {
      done(
        await saveAddOn({
          id: editId ?? undefined,
          name: addon.name,
          description: addon.description,
          price: Number(addon.price) || 0,
          price_type: addon.price_type,
          is_active: addon.is_active,
        }),
      );
    });
  }

  function submitFee() {
    setError(null);
    startTransition(async () => {
      done(
        await saveFee({
          id: editId ?? undefined,
          name: fee.name,
          description: fee.description,
          amount: Number(fee.amount) || 0,
          fee_type: fee.fee_type,
          is_taxable: fee.is_taxable,
          is_active: fee.is_active,
        }),
      );
    });
  }

  function toggle(table: "add_ons" | "fees", id: string, active: boolean) {
    startTransition(async () => {
      await toggleCatalogItem(table, id, active);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ADD-ONS */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Add-ons</CardTitle>
          <Button size="sm" variant="outline" onClick={() => openAddon()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {addOns.length === 0 && (
            <p className="text-sm text-slate-400">No add-ons configured.</p>
          )}
          {addOns.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(a.price)} /{" "}
                  {a.price_type === "per_day" ? "day" : "rental"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle("add_ons", a.id, !a.is_active)}
                  disabled={pending}
                >
                  <Badge tone={a.is_active ? "green" : "gray"}>
                    {a.is_active ? "Active" : "Inactive"}
                  </Badge>
                </button>
                <button
                  onClick={() => openAddon(a)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* FEES */}
      <Card>
        <CardHeader>
          <CardTitle>Fees</CardTitle>
          <Button size="sm" variant="outline" onClick={() => openFee()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {fees.length === 0 && (
            <p className="text-sm text-slate-400">No fees configured.</p>
          )}
          {fees.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{f.name}</p>
                <p className="text-xs text-slate-500">
                  {f.fee_type === "percentage"
                    ? `${f.amount}%`
                    : formatCurrency(f.amount)}
                  {f.is_taxable ? " · taxable" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle("fees", f.id, !f.is_active)}
                  disabled={pending}
                >
                  <Badge tone={f.is_active ? "green" : "gray"}>
                    {f.is_active ? "Active" : "Inactive"}
                  </Badge>
                </button>
                <button
                  onClick={() => openFee(f)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* ADD-ON MODAL */}
      <Modal
        open={modal === "addon"}
        onClose={() => setModal(null)}
        title={editId ? "Edit Add-on" : "New Add-on"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitAddon} loading={pending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Name" required>
            <Input value={addon.name}
              onChange={(e) => setAddon({ ...addon, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={addon.description}
              onChange={(e) => setAddon({ ...addon, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <Input type="number" step="0.01" value={addon.price}
                onChange={(e) => setAddon({ ...addon, price: e.target.value })} />
            </Field>
            <Field label="Billing">
              <Select value={addon.price_type}
                onChange={(e) =>
                  setAddon({ ...addon, price_type: e.target.value as AddonPriceType })}>
                <option value="per_rental">Per Rental</option>
                <option value="per_day">Per Day</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={addon.is_active}
              onChange={(e) => setAddon({ ...addon, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
            Active &amp; available for booking
          </label>
        </div>
      </Modal>

      {/* FEE MODAL */}
      <Modal
        open={modal === "fee"}
        onClose={() => setModal(null)}
        title={editId ? "Edit Fee" : "New Fee"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitFee} loading={pending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Name" required>
            <Input value={fee.name}
              onChange={(e) => setFee({ ...fee, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={fee.description}
              onChange={(e) => setFee({ ...fee, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input type="number" step="0.01" value={fee.amount}
                onChange={(e) => setFee({ ...fee, amount: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select value={fee.fee_type}
                onChange={(e) =>
                  setFee({ ...fee, fee_type: e.target.value as FeeType })}>
                <option value="fixed">Fixed ($)</option>
                <option value="percentage">Percentage (%)</option>
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={fee.is_taxable}
                onChange={(e) => setFee({ ...fee, is_taxable: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
              Taxable
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={fee.is_active}
                onChange={(e) => setFee({ ...fee, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
              Active
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
