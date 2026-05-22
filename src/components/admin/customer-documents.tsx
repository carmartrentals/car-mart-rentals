"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Eye, CheckCircle2, XCircle, Loader2, RefreshCw, FileText,
  ShieldCheck, ShieldAlert, AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import {
  setCustomerDocument, verifyDriverLicense, verifyInsurance,
} from "@/app/admin/(panel)/customers/actions";
import {
  DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, isExpired,
} from "@/lib/documents";
import { formatDate } from "@/lib/utils";
import type { Customer, DocumentStatus } from "@/lib/types/database";

type DocKind = "dl_front" | "dl_back" | "insurance";

export function CustomerDocuments({ customer }: { customer: Customer }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-600" /> Document Verification
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Driver license */}
        <DocSection
          title="Driver License"
          status={customer.dl_status}
          rejectionReason={customer.dl_rejection_reason}
          method={customer.dl_verification_method}
          onVerify={(decision, reason) =>
            verifyDriverLicense(customer.id, decision, reason)
          }
          slots={
            <>
              <DocSlot
                customerId={customer.id}
                kind="dl_front"
                label="License — Front"
                url={customer.dl_front_url}
                onError={setError}
              />
              <DocSlot
                customerId={customer.id}
                kind="dl_back"
                label="License — Back"
                url={customer.dl_back_url}
                onError={setError}
              />
            </>
          }
          details={[
            { label: "License #", value: customer.dl_number },
            { label: "Issuing state", value: customer.dl_state },
            {
              label: "Expires",
              value: customer.dl_expiration
                ? formatDate(customer.dl_expiration)
                : null,
              expired: isExpired(customer.dl_expiration),
            },
          ]}
          onError={setError}
        />

        <div className="border-t border-slate-100" />

        {/* Insurance */}
        <DocSection
          title="Proof of Insurance"
          status={customer.insurance_status}
          rejectionReason={customer.insurance_rejection_reason}
          method={null}
          onVerify={(decision, reason) =>
            verifyInsurance(customer.id, decision, reason)
          }
          slots={
            <DocSlot
              customerId={customer.id}
              kind="insurance"
              label="Insurance"
              url={customer.insurance_doc_url}
              onError={setError}
            />
          }
          details={[
            { label: "Company", value: customer.insurance_company },
            { label: "Policy #", value: customer.insurance_policy_no },
            {
              label: "Expires",
              value: customer.insurance_expiration
                ? formatDate(customer.insurance_expiration)
                : null,
              expired: isExpired(customer.insurance_expiration),
            },
          ]}
          onError={setError}
        />
      </CardBody>
    </Card>
  );
}

function DocSection({
  title,
  status,
  rejectionReason,
  method,
  onVerify,
  slots,
  details,
  onError,
}: {
  title: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  method: string | null;
  onVerify: (
    decision: "verified" | "rejected",
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  slots: React.ReactNode;
  details: { label: string; value: string | null; expired?: boolean }[];
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function decide(decision: "verified" | "rejected", reasonText?: string) {
    onError(null);
    startTransition(async () => {
      const res = await onVerify(decision, reasonText);
      if (res.ok) {
        setRejecting(false);
        setReason("");
        router.refresh();
      } else {
        onError(res.error ?? "Could not update.");
      }
    });
  }

  const anyExpired = details.some((d) => d.expired);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <Badge tone={DOCUMENT_STATUS_TONE[status]}>
          {DOCUMENT_STATUS_LABEL[status]}
        </Badge>
      </div>

      {status === "rejected" && rejectionReason && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Rejected:</strong> {rejectionReason}
          </span>
        </div>
      )}

      {anyExpired && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>This document has expired — a current version is required.</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">{slots}</div>

      <div className="grid gap-3 sm:grid-cols-3">
        {details.map((d) => (
          <div key={d.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {d.label}
            </p>
            <p
              className={
                d.expired
                  ? "text-sm font-medium text-rose-600"
                  : "text-sm text-slate-700"
              }
            >
              {d.value || "—"}
              {d.expired && " (expired)"}
            </p>
          </div>
        ))}
      </div>

      {method === "stripe_identity" && (
        <p className="text-xs text-slate-400">
          Submitted via instant Stripe Identity check.
        </p>
      )}

      {rejecting ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold text-slate-600">
            Reason for rejection (the customer will see this)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. The license photo is blurry — please re-take it in good light."
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={() => decide("rejected", reason)}
              loading={pending}
              disabled={!reason.trim()}
            >
              <XCircle className="h-4 w-4" /> Confirm Rejection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant={status === "verified" ? "outline" : "primary"}
            onClick={() => decide("verified")}
            loading={pending}
            disabled={status === "verified"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {status === "verified" ? "Verified" : "Verify"}
          </Button>
          <Button variant="outline" onClick={() => setRejecting(true)}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      )}
    </div>
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
