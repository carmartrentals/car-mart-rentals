"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { saveBlock, deleteBlock } from "@/app/admin/(panel)/calendar/block-actions";
import type { BlockType } from "@/lib/types/database";

export interface BlockRow {
  id: string;
  vehicle_id: string;
  start_at: string;
  end_at: string;
  block_type: BlockType;
  reason: string | null;
  vehicle: { year: number; make: string; model: string } | null;
}

export const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "personal", label: "Personal Use" },
  { value: "turo", label: "Turo / Other Platform" },
  { value: "hold", label: "Hold" },
  { value: "reserved_offline", label: "Reserved (Offline)" },
  { value: "other", label: "Other" },
];

const TYPE_LABEL: Record<BlockType, string> = Object.fromEntries(
  BLOCK_TYPES.map((t) => [t.value, t.label]),
) as Record<BlockType, string>;

const todayStr = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  vehicle_id: "",
  start_date: todayStr(),
  end_date: todayStr(),
  block_type: "maintenance" as BlockType,
  reason: "",
};

export function BlockManager({
  vehicles,
  blocks,
}: {
  vehicles: { id: string; label: string }[];
  blocks: BlockRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveBlock({
        vehicle_id: form.vehicle_id,
        start_at: `${form.start_date}T00:00`,
        end_at: `${form.end_date}T23:59`,
        block_type: form.block_type,
        reason: form.reason,
      });
      if (res.ok) {
        setForm({ ...EMPTY });
        router.refresh();
      } else {
        setError(res.error ?? "Could not save the block.");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    setRemovingId(id);
    startTransition(async () => {
      const res = await deleteBlock(id);
      setRemovingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error ?? "Could not remove the block.");
      }
    });
  }

  const vehName = (b: BlockRow) =>
    b.vehicle
      ? `${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model}`
      : "Vehicle";

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarOff className="h-4 w-4" /> Block Vehicle
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Block a Vehicle"
        description="Reserve dates for maintenance, personal use or other platforms — blocked dates can't be booked online."
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        }
      >
        <div className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          {/* Add block form */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Field label="Vehicle" required>
              <Select value={form.vehicle_id}
                onChange={(e) => set("vehicle_id", e.target.value)}>
                <option value="">Select a vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Date" required>
                <Input type="date" value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)} />
              </Field>
              <Field label="End Date" required>
                <Input type="date" value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)} />
              </Field>
            </div>
            <Field label="Reason">
              <Select value={form.block_type}
                onChange={(e) => set("block_type", e.target.value as BlockType)}>
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes (optional)">
              <Textarea value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="e.g. Annual service at the dealership" />
            </Field>
            <Button onClick={submit} loading={pending} className="w-full">
              <Plus className="h-4 w-4" /> Add Block
            </Button>
          </div>

          {/* Existing blocks */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current & upcoming blocks
            </p>
            {blocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                No vehicle blocks scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-800">
                          {vehName(b)}
                        </span>
                        <Badge tone="gray">{TYPE_LABEL[b.block_type]}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(b.start_at)} – {formatDate(b.end_at)}
                        {b.reason ? ` · ${b.reason}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(b.id)}
                      disabled={pending && removingId === b.id}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Remove block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
