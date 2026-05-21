"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Trash2, ExternalLink, Upload, Loader2, CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import {
  saveVehicleDocument, deleteVehicleDocument,
} from "@/app/admin/(panel)/vehicles/document-actions";
import type { VehicleDocType, VehicleDocument } from "@/lib/types/database";

const DOC_TYPES: { value: VehicleDocType; label: string }[] = [
  { value: "registration", label: "Registration" },
  { value: "insurance", label: "Insurance Card" },
  { value: "title", label: "Title" },
  { value: "inspection", label: "Inspection" },
  { value: "smog_emissions", label: "Smog / Emissions" },
  { value: "lease_finance", label: "Lease / Finance" },
  { value: "purchase", label: "Purchase / Bill of Sale" },
  { value: "warranty", label: "Warranty" },
  { value: "other", label: "Other" },
];
const TYPE_LABEL: Record<VehicleDocType, string> = Object.fromEntries(
  DOC_TYPES.map((t) => [t.value, t.label]),
) as Record<VehicleDocType, string>;

/** Expiry status for a document, or null when it's fine / has no expiry. */
function expiryStatus(
  expiry: string | null,
): { label: string; tone: "red" | "amber" } | null {
  if (!expiry) return null;
  const days = Math.ceil(
    (new Date(expiry).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 30)
    return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, tone: "amber" };
  return null;
}

const EMPTY = {
  docType: "registration" as VehicleDocType,
  name: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
};

export function VehicleDocuments({
  vehicleId,
  documents,
}: {
  vehicleId: string;
  documents: VehicleDocument[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, startDelete] = useTransition();

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openNew() {
    setError(null);
    setForm(EMPTY);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(true);
  }

  async function submit() {
    setError(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("File too large. Maximum size is 15 MB.");
      return;
    }
    const name = form.name.trim() || TYPE_LABEL[form.docType];

    setBusy(true);
    try {
      // 1. Upload the file via the admin upload route.
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "documents");
      fd.append("folder", `vehicle-docs/${vehicleId}`);
      const upRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson.error ?? "Upload failed.");

      // 2. Save the document record.
      const res = await saveVehicleDocument({
        vehicleId,
        docType: form.docType,
        name,
        fileUrl: upJson.url,
        filePath: upJson.path ?? "",
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        notes: form.notes,
      });
      if (!res.ok) throw new Error(res.error ?? "Could not save the document.");

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function remove(doc: VehicleDocument) {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    startDelete(async () => {
      await deleteVehicleDocument(doc.id, vehicleId);
      router.refresh();
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Vehicle Documents</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </CardHeader>

      {documents.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No documents yet. Add the registration, insurance card, title and more.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((d) => {
            const status = expiryStatus(d.expiry_date);
            return (
              <li
                key={d.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {d.name}
                    </p>
                    <Badge tone="gray">{TYPE_LABEL[d.doc_type]}</Badge>
                    {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.issue_date && `Issued ${formatDate(d.issue_date)}`}
                    {d.issue_date && d.expiry_date && " · "}
                    {d.expiry_date && `Expires ${formatDate(d.expiry_date)}`}
                    {!d.issue_date && !d.expiry_date && "No dates recorded"}
                    {d.notes ? ` · ${d.notes}` : ""}
                  </p>
                </div>
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View
                </a>
                <button
                  onClick={() => remove(d)}
                  disabled={deleting}
                  className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Add Vehicle Document"
        description="Upload registration, insurance, title or any other vehicle paperwork."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Save Document
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Document Type">
              <Select
                value={form.docType}
                onChange={(e) => set("docType", e.target.value as VehicleDocType)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Document Name">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={TYPE_LABEL[form.docType]}
              />
            </Field>
          </div>

          <Field label="File" required>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {file ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Choose a file (PDF or image)
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue Date">
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => set("issueDate", e.target.value)}
              />
            </Field>
            <Field label="Expiry Date" hint="Used for renewal reminders">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything worth noting about this document"
            />
          </Field>

          {busy && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </p>
          )}
        </div>
      </Modal>
    </Card>
  );
}
