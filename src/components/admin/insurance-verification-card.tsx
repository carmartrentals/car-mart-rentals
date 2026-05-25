"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { formatDateTime, formatDate } from "@/lib/utils";
import { describeInsuranceFlag } from "@/lib/ai-insurance-check";
import { runAiInsuranceCheck } from "@/app/admin/(panel)/customers/insurance-actions";

type RiskLevel = "low" | "medium" | "high" | "block" | null;

const RISK_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  low: "green",
  medium: "amber",
  high: "red",
  block: "red",
};

export function InsuranceVerificationCard({
  customer,
}: {
  customer: {
    id: string;
    insurance_doc_url: string | null;
    insurance_company: string | null;
    insurance_policy_no: string | null;
    insurance_expiration: string | null;
    insurance_ai_check_at: string | null;
    insurance_ai_check_score: number | null;
    insurance_ai_check_flags: string[] | null;
    insurance_ai_check_summary: string | null;
    insurance_risk_level: string | null;
  };
}) {
  const router = useRouter();
  const [aiPending, startAi] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const risk = customer.insurance_risk_level as RiskLevel;
  const aiFlags = customer.insurance_ai_check_flags ?? [];
  const isExpired =
    !!customer.insurance_expiration &&
    new Date(customer.insurance_expiration) < new Date();

  function runAi() {
    setError(null);
    startAi(async () => {
      const res = await runAiInsuranceCheck(customer.id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not run AI check.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Insurance Verification
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
                <Sparkles className="mr-1 inline h-3 w-3" /> AI Document
                Inspection
              </p>
              {customer.insurance_ai_check_at ? (
                <>
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="text-2xl font-bold text-slate-900">
                      {customer.insurance_ai_check_score}/100
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      authenticity score
                    </span>
                  </p>
                  {customer.insurance_ai_check_summary && (
                    <p className="mt-1.5 text-sm text-slate-600">
                      {customer.insurance_ai_check_summary}
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
                          {describeInsuranceFlag(f)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Last checked {formatDateTime(customer.insurance_ai_check_at)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Not yet inspected. Run the AI check to validate the
                  document, cross-reference the named insured, and read the
                  effective + expiration dates.
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runAi}
              disabled={aiPending || !customer.insurance_doc_url}
              title={
                !customer.insurance_doc_url
                  ? "Upload an insurance document first"
                  : undefined
              }
            >
              {aiPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {customer.insurance_ai_check_at
                ? "Re-run AI Check"
                : "Run AI Check"}
            </Button>
          </div>
        </div>

        {/* Quick reference */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Company
            </p>
            <p className="text-slate-700">{customer.insurance_company || "—"}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Policy #
            </p>
            <p className="text-slate-700">
              {customer.insurance_policy_no || "—"}
            </p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Expires
            </p>
            <p
              className={
                isExpired ? "font-medium text-rose-700" : "text-slate-700"
              }
            >
              {customer.insurance_expiration
                ? formatDate(customer.insurance_expiration)
                : "—"}
              {isExpired && " (EXPIRED)"}
            </p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">
              Document
            </p>
            <p className="text-slate-700">
              {customer.insurance_doc_url ? (
                <a
                  href={customer.insurance_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-gold-700 hover:underline"
                >
                  <FileText className="h-3 w-3" /> View
                </a>
              ) : (
                "Not uploaded"
              )}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
