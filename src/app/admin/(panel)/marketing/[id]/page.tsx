import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Send, AlertTriangle, Mail } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime } from "@/lib/utils";
import { deleteCampaign } from "../actions";
import type { MarketingCampaign, MarketingRecipient } from "@/lib/types/database";

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  draft: "gray",
  sending: "amber",
  sent: "green",
  failed: "red",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaign: MarketingCampaign | null = null;
  let recipients: MarketingRecipient[] = [];

  try {
    const admin = createAdminClient();
    const [c, r] = await Promise.all([
      admin
        .from("marketing_campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      admin
        .from("marketing_recipients")
        .select("*")
        .eq("campaign_id", id)
        .order("opened_at", { ascending: false, nullsFirst: false })
        .limit(500),
    ]);
    campaign = c.data as MarketingCampaign | null;
    recipients = (r.data as MarketingRecipient[]) ?? [];
  } catch {
    notFound();
  }
  if (!campaign) notFound();

  const c = campaign;
  const opens = recipients.filter((r) => r.opened_at);
  const fails = recipients.filter((r) => r.send_error);
  const openRate =
    c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;

  return (
    <>
      <Link
        href="/admin/marketing"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Marketing
      </Link>

      <PageHeader
        title={c.name}
        subtitle={c.sent_at ? `Sent ${formatDateTime(c.sent_at)}` : c.status}
        actions={
          <>
            <Badge tone={STATUS_TONE[c.status] ?? "gray"}>{c.status}</Badge>
            <DeleteButton
              action={async () => {
                "use server";
                await deleteCampaign(id);
              }}
              title="Delete campaign"
              message="Delete this campaign + all its recipient records?"
            />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat icon={Send} label="Sent" value={String(c.sent_count)} />
        <Stat icon={Eye} label="Unique opens" value={String(c.opened_count)} />
        <Stat icon={Mail} label="Open rate" value={`${openRate}%`} />
        <Stat
          icon={AlertTriangle}
          label="Failed"
          value={String(c.failed_count)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Recipients list */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients ({recipients.length})</CardTitle>
              <p className="text-xs text-slate-500">
                Opens listed first.
              </p>
            </CardHeader>
            {recipients.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">
                  No recipients on this campaign.
                </p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Email</TH>
                    <TH>Sent</TH>
                    <TH>Opened</TH>
                    <TH className="text-right">Opens</TH>
                  </TR>
                </THead>
                <TBody>
                  {recipients.map((r) => (
                    <TR key={r.id}>
                      <TD className="font-medium text-slate-800">{r.email}</TD>
                      <TD className="text-xs text-slate-500">
                        {r.sent_at ? (
                          formatDateTime(r.sent_at)
                        ) : r.send_error ? (
                          <span className="text-rose-600">
                            Failed: {r.send_error}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="text-xs">
                        {r.opened_at ? (
                          <span className="text-emerald-700">
                            {formatDateTime(r.opened_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TD>
                      <TD className="text-right text-sm">{r.open_count || 0}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          {fails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                    Failed sends ({fails.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1.5 text-sm">
                  {fails.map((f) => (
                    <li key={f.id} className="text-slate-700">
                      <span className="font-medium">{f.email}</span> —{" "}
                      <span className="text-rose-600">{f.send_error}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar: email preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Detail label="Subject" value={c.subject} />
              {c.preheader && <Detail label="Preheader" value={c.preheader} />}
              <Detail label="Sent at" value={c.sent_at ? formatDateTime(c.sent_at) : "—"} />
              {c.cta_label && (
                <Detail label="CTA" value={`${c.cta_label} → ${c.cta_url}`} />
              )}
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                  Body
                </p>
                <div className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {c.body}
                </div>
              </div>
            </CardBody>
          </Card>

          {opens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-600" />
                    Latest opens
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {opens.slice(0, 8).map((o) => (
                    <li key={o.id} className="flex justify-between gap-3">
                      <span className="truncate font-medium text-slate-700">
                        {o.email}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {o.opened_at && formatDateTime(o.opened_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <Icon className="h-5 w-5 text-gold-600" />
      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-800">{value}</p>
    </div>
  );
}
