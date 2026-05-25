"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { formatDateTime, formatDate } from "@/lib/utils";
import { describeFlag } from "@/lib/ai-license-check";
import {
  runAiLicenseCheck,
  setDmvCheckResult,
} from "@/app/admin/(panel)/customers/license-actions";

type RiskLevel = "low" | "medium" | "high" | "block" | null;

const RISK_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  low: "green",
  medium: "amber",
  high: "red",
  block: "red",
};

export function LicenseVerificationCard({
  customer,
  dmvLookupUrl,
}: {
  customer: {
    id: string;
    dl_state: string | null;
    dl_number: string | null;
    dl_expiration: string | null;
    dl_ai_check_at: string | null;
    dl_ai_check_score: number | null;
    dl_ai_check_flags: string[] | null;
    dl_ai_check_summary: string | null;
    dl_dmv_check_at: string | null;
    dl_dmv_check_status: string | null;
    dl_dmv_check_provider: string | null;
    dl_dmv_check_notes: string | null;
    license_risk_level: string | null;
  };
  dmvLookupUrl?: string;
}) {
  const router = useRouter();
  const [aiPending, startAi] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dmvOpen, setDmvOpen] = useState(false);
  const [dmvStatus, setDmvStatus] = useState("valid");
  const [dmvNotes, setDmvNotes] = useState("");
  const [dmvPending, startDmv] = useTransition();

  const risk = customer.license_risk_level as RiskLevel;
  const aiFlags = customer.dl_ai_check_flags ?? [];
  const isExpired =
    !!customer.dl_expiration &&
    new Date(customer.dl_expiration) < new Date();

  function runAi() {
    setError(null);
    startAi(async () => {
      const res = await runAiLicenseCheck(customer.id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not run AI check.");
    });
  }

  function saveDmv() {
    setError(null);
    startDmv(async () => {
      const res = await setDmvCheckResult(customer.id, {
        status: dmvStatus as "valid" | "suspended" | "revoked" | "expired" | "unknown",
        notes: dmvNotes,
        provider: "manual",
      });
      if (res.ok) {
        setDmvOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save DMV result.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            License Verification
          </span>
        </CardTitle>
        {risk && (
          <Badge tone={RISK_TONE[risk]}>
            {risk === "block" ? "BLOCK rental" : `${risk} risk`}
          </Badge>
        )}
      </CardHeader>

      <CardBody className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        {/* AI inspection */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="mr-1 inline h-3 w-3" /> AI Photo Inspection
              </p>
              {customer.dl_ai_check_at ? (
                <>
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="text-2xl font-bold text-slate-900">
                      {customer.dl_ai_check_score}/100
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      authenticity score
                    </span>
                  </p>
                  {customer.dl_ai_check_summary && (
                    <p className="mt-1.5 text-sm text-slate-600">
                      {customer.dl_ai_check_summary}
                    </p>
                  )}
                  {aiFlags.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {aiFlags.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-1.5 text-xs text-rose-700"
                        >
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {describeFlag(f)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Last checked {formatDateTime(customer.dl_ai_check_at)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Not yet inspected. Run the AI check to validate photo
                  authenticity and cross-reference name / DOB / license number.
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runAi}
              disabled={aiPending}
            >
              {aiPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {customer.dl_ai_check_at ? "Re-run AI Check" : "Run AI Check"}
            </Button>
          </div>
        </div>

        {/* DMV check */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShieldAlert className="mr-1 inline h-3 w-3" /> DMV / MVR Check
              </p>
              {customer.dl_dmv_check_at ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      tone={
                        customer.dl_dmv_check_status === "valid"
                          ? "green"
                          : customer.dl_dmv_check_status === "unknown"
                            ? "gray"
                            : "red"
                      }
                    >
                      {customer.dl_dmv_check_status}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      via {customer.dl_dmv_check_provider}
                    </span>
                  </div>
                  {customer.dl_dmv_check_notes && (
                    <p className="mt-2 text-sm text-slate-600">
                      {customer.dl_dmv_check_notes}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Checked {formatDateTime(customer.dl_dmv_check_at)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  No DMV check on file. For high-value rentals, verify the
                  license is active with the state DMV.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {dmvLookupUrl && (
                <a
                  href={dmvLookupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3 w-3" /> Open DMV
                </a>
              )}
              <Button size="sm" onClick={() => setDmvOpen(true)}>
                <Check className="h-4 w-4" />
                Record DMV Result
              </Button>
            </div>
          </div>
        </div>

        {/* Quick reference */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              License #
            </p>
            <p className="text-slate-700">{customer.dl_number || "—"}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              State
            </p>
            <p className="text-slate-700">{customer.dl_state || "—"}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Expires
            </p>
            <p className={isExpired ? "font-medium text-rose-700" : "text-slate-700"}>
              {customer.dl_expiration ? formatDate(customer.dl_expiration) : "—"}
              {isExpired && " (EXPIRED)"}
            </p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Overall Risk
            </p>
            <p className="text-slate-700">{risk || "Not assessed"}</p>
          </div>
        </div>
      </CardBody>

      {/* DMV record modal */}
      <Modal
        open={dmvOpen}
        onClose={() => setDmvOpen(false)}
        title="Record DMV Check Result"
        description="After looking up the license on your state DMV portal, record what you found here."
        footer={
          <>
            <Button variant="outline" onClick={() => setDmvOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDmv} loading={dmvPending}>
              <Check className="h-4 w-4" /> Save Result
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="License status from DMV">
            <Select
              value={dmvStatus}
              onChange={(e) => setDmvStatus(e.target.value)}
            >
              <option value="valid">Valid / In Good Standing</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
              <option value="unknown">Couldn&apos;t Verify</option>
            </Select>
          </Field>
          <Field
            label="Notes (optional)"
            hint="Any violations, expiration date confirmed, or follow-up needed"
          >
            <Textarea
              rows={3}
              value={dmvNotes}
              onChange={(e) => setDmvNotes(e.target.value)}
              placeholder="e.g. Verified on CA DMV Driver Record portal — license active, no points."
            />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
