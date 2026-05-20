"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Eye, CheckCircle2, Clock, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import {
  setCustomerDocument, verifyCustomerDocuments,
} from "@/app/admin/(panel)/customers/actions";

type DocKind = "dl_front" | "dl_back" | "insurance";

export function CustomerDocuments({
  customerId,
  dlFront,
  dlBack,
  insurance,
  verified,
}: {
  customerId: string;
  dlFront: string | null;
  dlBack: string | null;
  insurance: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleVerified() {
    setError(null);
    startTransition(async () => {
      const res = await verifyCustomerDocuments(customerId, !verified);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not update.");
    });
  }

  const allUploaded = Boolean(dlFront && dlBack);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <Badge tone={verified ? "green" : "amber"}>
          {verified ? "Verified" : "Pending"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid gap-3 sm:grid-cols-3">
          <DocSlot
            customerId={customerId}
            kind="dl_front"
            label="License — Front"
            url={dlFront}
            onError={setError}
          />
          <DocSlot
            customerId={customerId}
            kind="dl_back"
            label="License — Back"
            url={dlBack}
            onError={setError}
          />
          <DocSlot
            customerId={customerId}
            kind="insurance"
            label="Insurance"
            url={insurance}
            onError={setError}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            {verified
              ? "Documents have been reviewed and verified."
              : allUploaded
                ? "Review the uploaded documents, then confirm."
                : "Waiting for the customer to upload their documents."}
          </p>
          <Button
            variant={verified ? "outline" : "primary"}
            onClick={toggleVerified}
            loading={pending}
          >
            {verified ? (
              <>
                <Clock className="h-4 w-4" /> Mark as Pending
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Verify Documents
              </>
            )}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function DocSlot({
  customerId,
  kind,
  label,
  url,
  onError,
}: {
  customerId: string;
  kind: DocKind;
  label: string;
  url: string | null;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "documents");
      form.append("folder", `customer-${customerId}`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      const saved = await setCustomerDocument(customerId, kind, data.url);
      if (!saved.ok) throw new Error(saved.error ?? "Could not save.");
      router.refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-[16/10] overflow-hidden rounded bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-full w-full object-cover" />
        </a>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded bg-slate-50 text-slate-300">
          <FileText className="h-7 w-7" />
        </div>
      )}
      <div className="mt-2 flex gap-1.5">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </a>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : url ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {url ? "Replace" : "Upload"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
