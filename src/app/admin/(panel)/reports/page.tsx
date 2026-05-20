import Link from "next/link";
import {
  DollarSign, AlertCircle, ClipboardList, CheckCircle2, Download,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ReportBarChart } from "@/components/admin/report-chart";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { RESERVATION_SOURCES } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type Period = "month" | "quarter" | "year" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "This Month" },
  { key: "quarter", label: "Last 90 Days" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

function periodStart(period: Period): Date {
  const now = new Date();
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  if (period === "quarter") {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    return d;
  }
  if (period === "all") return new Date(2000, 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

interface ResRow {
  reservation_number: string;
  status: string;
  source: string;
  total: number;
  balance_due: number;
  amount_paid: number;
  vehicle: { year: number; make: string; model: string } | null;
  customer: { first_name: string; last_name: string } | null;
}

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const period = (PERIODS.find((p) => p.key === sp.period)?.key ?? "month") as Period;
  const startIso = periodStart(period).toISOString();

  let reservations: ResRow[] = [];
  let collected = 0;
  let maintenanceByVehicle: { name: string; cost: number }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const [resRes, payRes, mntRes] = await Promise.all([
      admin
        .from("reservations")
        .select(
          "reservation_number,status,source,total,balance_due,amount_paid,vehicle:vehicles(year,make,model),customer:customers(first_name,last_name)",
        )
        .gte("pickup_at", startIso)
        .limit(1000),
      admin
        .from("payments")
        .select("amount,payment_type,status")
        .gte("created_at", startIso),
      admin
        .from("maintenance_records")
        .select("cost,vehicle:vehicles(year,make,model)")
        .gte("created_at", startIso),
    ]);

    reservations = (resRes.data as unknown as ResRow[]) ?? [];

    for (const p of payRes.data ?? []) {
      if (p.status !== "succeeded") continue;
      if (p.payment_type === "payment") collected += Number(p.amount);
      else if (p.payment_type === "refund") collected -= Number(p.amount);
    }

    const mMap = new Map<string, number>();
    for (const m of (mntRes.data ?? []) as unknown as {
      cost: number;
      vehicle: { year: number; make: string; model: string } | null;
    }[]) {
      const name = m.vehicle
        ? `${m.vehicle.year} ${m.vehicle.make} ${m.vehicle.model}`
        : "Unassigned";
      mMap.set(name, (mMap.get(name) ?? 0) + Number(m.cost));
    }
    maintenanceByVehicle = [...mMap.entries()]
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  } catch {
    configError = true;
  }

  // --- Aggregations ---------------------------------------------------------
  const activeRes = reservations.filter((r) => r.status !== "cancelled");
  const bookedRevenue = activeRes.reduce((s, r) => s + Number(r.total), 0);
  const outstanding = activeRes.reduce((s, r) => s + Number(r.balance_due), 0);
  const completed = reservations.filter((r) => r.status === "completed").length;

  const revByVehicleMap = new Map<string, { revenue: number; count: number }>();
  for (const r of activeRes) {
    const name = r.vehicle
      ? `${r.vehicle.make} ${r.vehicle.model}`
      : "Unassigned";
    const cur = revByVehicleMap.get(name) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(r.total);
    cur.count += 1;
    revByVehicleMap.set(name, cur);
  }
  const revByVehicle = [...revByVehicleMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const bySourceMap = new Map<string, number>();
  for (const r of reservations) {
    bySourceMap.set(r.source, (bySourceMap.get(r.source) ?? 0) + 1);
  }
  const bySource = [...bySourceMap.entries()].sort((a, b) => b[1] - a[1]);

  const topOutstanding = [...activeRes]
    .filter((r) => Number(r.balance_due) > 0)
    .sort((a, b) => Number(b.balance_due) - Number(a.balance_due))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Revenue, utilization and financial analytics."
        actions={
          <a href={`/api/admin/reports/export?period=${period}`}>
            <Button variant="outline">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load report data. Check Supabase configuration.
          </Alert>
        </div>
      )}

      {/* Period selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/reports?period=${p.key}`}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              period === p.key
                ? "bg-brand-950 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Key metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected Revenue"
          value={formatCurrency(collected)}
          icon={DollarSign}
          tone="green"
          hint="Payments received"
        />
        <StatCard
          label="Booked Revenue"
          value={formatCurrency(bookedRevenue)}
          icon={ClipboardList}
          tone="blue"
          hint="Total of all reservations"
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(outstanding)}
          icon={AlertCircle}
          tone="amber"
          hint="Still owed"
        />
        <StatCard
          label="Completed Rentals"
          value={completed}
          icon={CheckCircle2}
          tone="default"
          hint={`${reservations.length} reservations total`}
        />
      </div>

      {/* Revenue by vehicle */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Revenue by Vehicle</CardTitle></CardHeader>
        <CardBody>
          <ReportBarChart
            data={revByVehicle.slice(0, 8).map((v) => ({
              name: v.name,
              value: Math.round(v.revenue),
            }))}
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vehicle breakdown table */}
        <Card>
          <CardHeader><CardTitle>Vehicle Performance</CardTitle></CardHeader>
          {revByVehicle.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-400">No reservations in this period.</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Vehicle</TH>
                  <TH className="text-right">Rentals</TH>
                  <TH className="text-right">Revenue</TH>
                </TR>
              </THead>
              <TBody>
                {revByVehicle.map((v) => (
                  <TR key={v.name}>
                    <TD className="font-medium text-slate-800">{v.name}</TD>
                    <TD className="text-right">{v.count}</TD>
                    <TD className="text-right font-medium">
                      {formatCurrency(v.revenue)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Reservations by source */}
        <Card>
          <CardHeader><CardTitle>Reservations by Source</CardTitle></CardHeader>
          {bySource.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-400">No reservations in this period.</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Source</TH>
                  <TH className="text-right">Count</TH>
                  <TH className="text-right">Share</TH>
                </TR>
              </THead>
              <TBody>
                {bySource.map(([source, count]) => (
                  <TR key={source}>
                    <TD className="font-medium text-slate-800">
                      {RESERVATION_SOURCES[source as keyof typeof RESERVATION_SOURCES] ?? source}
                    </TD>
                    <TD className="text-right">{count}</TD>
                    <TD className="text-right text-slate-500">
                      {Math.round((count / reservations.length) * 100)}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Top outstanding balances */}
        <Card>
          <CardHeader><CardTitle>Top Outstanding Balances</CardTitle></CardHeader>
          {topOutstanding.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-400">No outstanding balances. 🎉</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Reservation</TH>
                  <TH>Customer</TH>
                  <TH className="text-right">Balance</TH>
                </TR>
              </THead>
              <TBody>
                {topOutstanding.map((r) => (
                  <TR key={r.reservation_number}>
                    <TD className="font-medium text-slate-800">
                      {r.reservation_number}
                    </TD>
                    <TD className="text-slate-600">
                      {r.customer
                        ? `${r.customer.first_name} ${r.customer.last_name}`
                        : "—"}
                    </TD>
                    <TD className="text-right font-semibold text-rose-600">
                      {formatCurrency(r.balance_due)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Maintenance cost by vehicle */}
        <Card>
          <CardHeader><CardTitle>Maintenance Cost by Vehicle</CardTitle></CardHeader>
          {maintenanceByVehicle.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-400">No maintenance costs in this period.</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Vehicle</TH>
                  <TH className="text-right">Cost</TH>
                </TR>
              </THead>
              <TBody>
                {maintenanceByVehicle.map((m) => (
                  <TR key={m.name}>
                    <TD className="font-medium text-slate-800">{m.name}</TD>
                    <TD className="text-right font-medium">
                      {formatCurrency(m.cost)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
