"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/misc";
import { saveLocation, toggleLocation } from "@/app/admin/(panel)/locations/actions";
import type { Location } from "@/lib/types/database";

const EMPTY = {
  name: "", address: "", city: "", state: "",
  zip: "", phone: "", email: "", is_active: true,
};

export function LocationManager({ locations }: { locations: Location[] }) {
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
  function openEdit(l: Location) {
    setError(null);
    setEditId(l.id);
    setForm({
      name: l.name,
      address: l.address ?? "",
      city: l.city ?? "",
      state: l.state ?? "",
      zip: l.zip ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      is_active: l.is_active,
    });
    setOpen(true);
  }
  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveLocation({ id: editId ?? undefined, ...form });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }
  function toggle(l: Location) {
    startTransition(async () => {
      await toggleLocation(l.id, !l.is_active);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {locations.length} location(s)
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations"
          description="Add your rental branch locations for pickups and returns."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {l.name}
                  <Badge tone={l.is_active ? "green" : "gray"}>
                    {l.is_active ? "Active" : "Inactive"}
                  </Badge>
                </p>
                <p className="text-xs text-slate-500">
                  {[l.address, l.city, l.state, l.zip].filter(Boolean).join(", ") || "—"}
                  {l.phone ? ` · ${l.phone}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(l)}
                  disabled={pending}
                  className="text-xs font-medium text-slate-400 hover:text-gold-600"
                >
                  {l.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openEdit(l)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Location" : "New Location"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Location Name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Street Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="ZIP">
              <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
            />
            Active &amp; available for pickups/returns
          </label>
        </div>
      </Modal>
    </Card>
  );
}
