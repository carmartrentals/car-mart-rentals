import Link from "next/link";
import { Plus, Mail, MailCheck, AlertCircle, Eye, Send } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import type { MarketingCampaign } from "@/lib/types/database";

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  draft: "gray",
  sending: "amber",
  sent: "green",
  failed: "red",
};

export default async function MarketingPage() {
  let campaigns: MarketingCampaign[] = [];
  let configError = false;
  let eligibleCount = 0;

  try {
    const admin = createAdminClient();
    const [campaignsRes, customersRes] = await Promise.all([
      admin
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .not("email", "is", null)
        .eq("marketing_opted_out", false)
        .eq("is_blacklisted", false),
    ]);
    campaigns = (campaignsRes.data as MarketingCampaign[]) ?? [];
    eligibleCount = customersRes.count ?? 0;
  } catch {
    configError = true;
  }

  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + (c.opened_count ?? 0), 0);
  const openRate =
    totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Send branded promotional emails to your customers and track who opens them."
        actions={
          <Link href="/admin/marketing/new">
            <Button>
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </Link>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load campaigns. Run migration 0028 in Supabase.
          </Alert>
        </div>
      )}

      {/* Top stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat
          icon={Mail}
          label="Eligible recipients"
          value={String(eligibleCount)}
          hint="Customers with an email, not opted out, not blacklisted."
        />
        <Stat
          icon={Send}
          label="Total sends (lifetime)"
          value={String(totalSent)}
        />
        <Stat
          icon={Eye}
          label="Total opens"
          value={String(totalOpens)}
        />
        <Stat
          icon={MailCheck}
          label="Overall open rate"
          value={`${openRate}%`}
          hint="Industry average for marketing email is ~22%."
        />
      </div>

      <Card>
        {campaigns.length === 0 ? (
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-500">
              <AlertCircle className="h-6 w-6 text-slate-400" />
              <p>No campaigns yet.</p>
              <Link href="/admin/marketing/new">
                <Button>
                  <Plus className="h-4 w-4" /> Create your first campaign
                </Button>
              </Link>
            </div>
          </CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Subject</TH>
                <TH>Status</TH>
                <TH className="text-right">Sent</TH>
                <TH className="text-right">Opens</TH>
                <TH className="text-right">Open %</TH>
                <TH>Sent at</TH>
              </TR>
            </THead>
            <TBody>
              {campaigns.map((c) => {
                const pct =
                  c.sent_count > 0
                    ? Math.round((c.opened_count / c.sent_count) * 100)
                    : 0;
                return (
                  <TR key={c.id}>
                    <TD className="font-medium text-slate-800">
                      <Link
                        href={`/admin/marketing/${c.id}`}
                        className="hover:text-gold-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TD>
                    <TD className="text-slate-600">{c.subject}</TD>
                    <TD>
                      <Badge tone={STATUS_TONE[c.status] ?? "gray"}>
                        {c.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">{c.sent_count}</TD>
                    <TD className="text-right">{c.opened_count}</TD>
                    <TD className="text-right font-medium">
                      {c.sent_count > 0 ? `${pct}%` : "—"}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {c.sent_at ? formatDateTime(c.sent_at) : "—"}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <Icon className="h-5 w-5 text-gold-600" />
      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
