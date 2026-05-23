import { Gift, Users, BadgeCheck, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, Alert } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getReferralProgram } from "@/lib/referral";
import { ReferralSettingsForm } from "@/components/admin/referral-settings-form";
import { ReferralsTable } from "@/components/admin/referrals-table";
import { formatDate } from "@/lib/utils";

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  reservation_id: string | null;
  referrer_id: string | null;
  referred_customer_id: string | null;
  referred_name: string | null;
}

interface DisplayRow {
  id: string;
  status: string;
  createdAt: string;
  referrerName: string;
  referrerEmail: string | null;
  referredName: string;
  reservationId: string | null;
  reservationNumber: string | null;
}

export default async function ReferralsPage() {
  await requireRole(["super_admin", "manager"]);

  const program = await getReferralProgram();
  let rows: DisplayRow[] = [];
  let configError = false;
  let totalReferrers = 0;
  let pendingCount = 0;
  let completedCount = 0;

  try {
    const admin = createAdminClient();

    const [{ data: refData }, { count: referrerCount }] = await Promise.all([
      admin
        .from("referrals")
        .select(
          "id, status, created_at, reservation_id, referrer_id, referred_customer_id, referred_name",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .not("referral_code", "is", null),
    ]);
    totalReferrers = referrerCount ?? 0;

    const referrals = (refData as ReferralRow[] | null) ?? [];

    // Bulk-load customers + reservations for display.
    const customerIds = Array.from(
      new Set(
        referrals
          .flatMap((r) => [r.referrer_id, r.referred_customer_id])
          .filter((id): id is string => !!id),
      ),
    );
    const reservationIds = referrals
      .map((r) => r.reservation_id)
      .filter((id): id is string => !!id);

    const customersMap = new Map<
      string,
      { first_name: string; last_name: string; email: string }
    >();
    if (customerIds.length) {
      const { data: c } = await admin
        .from("customers")
        .select("id, first_name, last_name, email")
        .in("id", customerIds);
      for (const row of (c as {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
      }[] | null) ?? []) {
        customersMap.set(row.id, row);
      }
    }

    const reservationsMap = new Map<string, string>();
    if (reservationIds.length) {
      const { data: rsv } = await admin
        .from("reservations")
        .select("id, reservation_number")
        .in("id", reservationIds);
      for (const row of (rsv as {
        id: string;
        reservation_number: string;
      }[] | null) ?? []) {
        reservationsMap.set(row.id, row.reservation_number);
      }
    }

    for (const r of referrals) {
      const referrer = r.referrer_id ? customersMap.get(r.referrer_id) : null;
      const referred = r.referred_customer_id
        ? customersMap.get(r.referred_customer_id)
        : null;
      rows.push({
        id: r.id,
        status: r.status,
        createdAt: formatDate(r.created_at),
        referrerName: referrer
          ? `${referrer.first_name} ${referrer.last_name}`.trim()
          : "—",
        referrerEmail: referrer?.email ?? null,
        referredName: referred
          ? `${referred.first_name} ${referred.last_name}`.trim()
          : r.referred_name || "—",
        reservationId: r.reservation_id,
        reservationNumber: r.reservation_id
          ? reservationsMap.get(r.reservation_id) ?? null
          : null,
      });
      if (r.status === "pending") pendingCount += 1;
      else if (r.status === "completed") completedCount += 1;
    }
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Referral Program"
        subtitle="Reward customers for bringing friends. Settings and history below."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load referrals. Confirm migration 0016 has run in Supabase.
          </Alert>
        </div>
      )}

      {/* Stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Customers with a code"
          value={totalReferrers.toString()}
        />
        <StatCard
          icon={Clock}
          label="Pending rewards"
          value={pendingCount.toString()}
          tone="amber"
        />
        <StatCard
          icon={BadgeCheck}
          label="Completed referrals"
          value={completedCount.toString()}
          tone="emerald"
        />
      </div>

      {/* Settings */}
      <Card className="mb-5">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Program Settings</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Control whether the program is enabled, the reward amount, and the
            text shown to customers on the &ldquo;Refer a Friend&rdquo; page.
          </p>
        </div>
        <div className="p-5">
          <ReferralSettingsForm initial={program} />
        </div>
      </Card>

      {/* Referrals list */}
      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Recent Referrals ({rows.length})
          </h2>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No referrals yet"
            description="When a customer books with a friend's referral code, it will appear here."
          />
        ) : (
          <ReferralsTable rows={rows} />
        )}
      </Card>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "amber" | "emerald";
}) {
  const accent =
    tone === "amber"
      ? "text-amber-600 bg-amber-50"
      : tone === "emerald"
        ? "text-emerald-600 bg-emerald-50"
        : "text-slate-600 bg-slate-100";
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
        >
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
