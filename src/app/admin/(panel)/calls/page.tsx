import Link from "next/link";
import {
  PhoneCall,
  ArrowRight,
  MessageSquare,
  PhoneForwarded,
  DollarSign,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { twilioConfigured } from "@/lib/twilio";
import type { CallLog } from "@/lib/types/database";

const INTENT_TONE: Record<string, "green" | "amber" | "blue" | "red" | "gray" | "purple"> = {
  booking: "green",
  pricing_question: "blue",
  insurance_claim: "purple",
  support: "amber",
  modify_reservation: "amber",
  complaint: "red",
  hours_or_location: "gray",
  transfer_to_human: "amber",
  no_answer: "gray",
  general: "gray",
};

function intentLabel(i: string | null) {
  if (!i) return "—";
  return i.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function SpendCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default async function CallsPage() {
  let calls: CallLog[] = [];
  let configError = false;
  // Rolling 30-day spend window.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let monthCount = 0;
  let monthSpend = 0;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("call_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);
    calls = (data as CallLog[]) ?? [];

    const { data: monthData } = await admin
      .from("call_logs")
      .select("total_cost")
      .gte("started_at", since);
    const monthRows = (monthData as { total_cost: number | null }[] | null) ?? [];
    monthCount = monthRows.length;
    monthSpend = monthRows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Phone Calls"
        subtitle="Every call answered by the AI receptionist — transcript, summary, recording."
      />

      {!twilioConfigured() && (
        <div className="mb-4">
          <Alert tone="warning">
            Twilio is not configured. Add{" "}
            <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>{" "}
            and <code>TWILIO_PHONE_NUMBER</code> to Vercel and point your
            Twilio number&apos;s voice webhook at{" "}
            <code>https://carmartrentals.com/api/twilio/voice</code>.
          </Alert>
        </div>
      )}

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load calls. Confirm migrations 0020 and 0021 have run
            in Supabase.
          </Alert>
        </div>
      )}

      {/* 30-day spend summary */}
      {calls.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SpendCard
            label="Calls (30 days)"
            value={monthCount.toString()}
            icon={PhoneCall}
          />
          <SpendCard
            label="AI receptionist spend"
            value={formatCurrency(monthSpend)}
            icon={DollarSign}
          />
          <SpendCard
            label="Avg cost per call"
            value={
              monthCount > 0 ? formatCurrency(monthSpend / monthCount) : "$0.00"
            }
            icon={DollarSign}
          />
        </div>
      )}

      <Card>
        {calls.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title="No calls yet"
            description="When a customer calls your Twilio number, the AI receptionist will answer and the conversation will appear here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>From</TH>
                <TH>Intent</TH>
                <TH>Summary</TH>
                <TH>Duration</TH>
                <TH className="text-right">Cost</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {calls.map((c) => (
                <TR key={c.id}>
                  <TD className="whitespace-nowrap text-slate-500">
                    {formatDateTime(c.started_at)}
                  </TD>
                  <TD>
                    <span className="block font-medium text-slate-800">
                      {c.caller_name || "Unknown"}
                    </span>
                    {c.from_number && (
                      <a
                        href={`tel:${c.from_number}`}
                        className="text-xs text-slate-500 hover:text-gold-700"
                      >
                        {c.from_number}
                      </a>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={INTENT_TONE[c.customer_intent ?? "general"] ?? "gray"}>
                      {intentLabel(c.customer_intent)}
                    </Badge>
                  </TD>
                  <TD className="max-w-md text-sm text-slate-600">
                    <span className="line-clamp-2">
                      {c.ai_summary || "(no summary)"}
                    </span>
                    <span className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      {c.sms_sent && (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> SMS sent
                        </span>
                      )}
                      {c.transferred && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneForwarded className="h-3 w-3" /> Transferred
                        </span>
                      )}
                    </span>
                  </TD>
                  <TD className="text-slate-600">
                    {formatDuration(c.duration_seconds)}
                  </TD>
                  <TD className="text-right font-medium text-slate-700">
                    {c.total_cost !== null && c.total_cost !== undefined
                      ? formatCurrency(Number(c.total_cost))
                      : "—"}
                  </TD>
                  <TD>
                    <Badge tone={c.status === "completed" ? "green" : "gray"}>
                      {c.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/admin/calls/${c.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gold-700 hover:text-gold-600"
                    >
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
