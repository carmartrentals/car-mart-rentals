import Link from "next/link";
import {
  DollarSign, AlertCircle, ClipboardList, CheckCircle2, Download,
  TrendingUp, TrendingDown,
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
import { formatCurrency, cn } from "@/lib/utils";

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

interface VehicleRef {
  id: string;
  year: number;
  make: string;
  model: string;
}
interface ResRow {
  reservation_number: string;
  status: string;
  source: string;
  total: number;
  balance_due: number;
  amount_paid: number;
  vehicle: VehicleRef | null;
  customer: { first_name: string; last_name: string } | null;
}

/** Per-vehicle profit & loss line. */
interface VehiclePnL {
  id: string;
  name: string;
  revenue: number;
  rentals: number;
  maintenance: number;
  expenses: number;
}

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const period = (PERIODS.find((p) => p.key === sp.period)?.key ?? "month") as Period;
  const start = periodStart(period);
  const startIso = start.toISOString();
  const startDate = startIso.slice(0, 10); // YYYY-MM-DD for date columns

  let reservations: ResRow[] = [];
  let collected = 0;
  let configError = false;

  // Per-vehicle profit & loss, keyed by vehicle id ("—" for unassigned).
  const pnl = new Map<string, VehiclePnL>();
  function row(id: string | null, name: string): VehiclePnL {
    const key = id ?? "—";
    let r = pnl.get(key);
    if (!r) {
      r = { id: key, name, revenue: 0, rentals: 0, maintenance: 0, expenses: 0 };
      pnl.set(key, r);
    }
    return r;
  }
  const vName = (v: VehicleRef | null) =>
    v ? `${v.year} ${v.make} ${v.model}` : "Unassigned";

  try {
    const admin = createAdminClient();
    const [resRes, payRes, mntRes, expRes] = await Promise.all([
      admin
        .from("reservations")
        .select(
          "reservation_number,status,source,total,balance_due,amount_paid,vehicle:vehicles(id,year,make,model),customer:customers(first_name,last_name)",
        )
        .gte("pickup_at", startIso)
        .limit(1000),
      admin
        .from("payments")
        .select("amount,payment_type,status")
        .gte("created_at", startIso),
      admin
        .from("maintenance_records")
        .select("cost,vehicle:vehicles(id,year,make,model)")
        .gte("created_at", startIso),
      admin
        .from("expenses")
        .select("amount,vehicle:vehicles(id,year,make,model)")
        .gte("expense_date", startDate),
    ]);

    reservations = (resRes.data as unknown as ResRow[]) ?? [];

    for (const p of payRes.data ?? []) {
      if (p.status !== "succeeded") continue;
      if (p.payment_type === "payment") collected += Number(p.amount);
      else if (p.payment_type === "refund") collected -= Number(p.amount);
    }

    // Revenue side of the P&L.
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const v = row(r.vehicle?.id ?? null, vName(r.vehicle));
      v.revenue += Number(r.total);
      v.rentals += 1;
    }

    // Maintenance costs.
    for (const m of (mntRes.data ?? []) as unknown as {
      cost: number;
      vehicle: VehicleRef | null;
    }[]) {
      row(m.vehicle?.id ?? null, vName(m.vehicle)).maintenance += Number(m.cost);
    }

    // Operating expenses.
    for (const e of (expRes.data ?? []) as unknown as {
      amount: number;
      vehicle: VehicleRef | null;
    }[]) {
      row(e.vehicle?.id ?? null, vName(e.vehicle)).expenses += Number(e.amount);
    }
  } catch {
    configError = true;
  }

  // --- Aggregations ---------------------------------------------------------
  const activeRes = reservations.filter((r) => r.status !== "cancelled");
  const bookedRevenue = activeRes.reduce((s, r) => s + Number(r.total), 0);
  const outstanding = activeRes.reduce((s, r) => s + Number(r.balance_due), 0);
  const completed = reservations.filter((r) => r.status === "completed").length;

  // Profit & loss.
  const pnlRows = [...pnl.values()].sort(
    (a, b) =>
      b.revenue - b.maintenance - b.expenses -
      (a.revenue - a.maintenance - a.expenses),
  );
  const totalMaintenance = pnlRows.reduce((s, v) => s + v.maintenance, 0);
  const totalExpenses = pnlRows.reduce((s, v) => s + v.expenses, 0);
  const totalCosts = totalMaintenance + totalExpenses;
  const netProfit = bookedRevenue - totalCosts;
  const margin =
    bookedRevenue > 0 ? Math.round((netProfit / bookedRevenue) * 100) : 0;

  const revByVehicle = pnlRows
    .filter((v) => v.revenue > 0)
    .map((v) => ({ name: v.name, revenue: v.revenue, count: v.rentals }))
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
        subtitle="Revenue, profit, utilization and financial analytics."
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

      {/* Profitability */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Profitability
      </h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Booked Revenue"
          value={formatCurrency(bookedRevenue)}
          icon={DollarSign}
          tone="blue"
        />
        <StatCard
          label="Maintenance Cost"
          value={formatCurrency(totalMaintenance)}
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          label="Operating Expenses"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          tone={netProfit >= 0 ? "green" : "red"}
          hint={`${margin}% profit margin`}
        />
      </div>

      {/* Profit by vehicle */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Profit by Vehicle</CardTitle></CardHeader>
        {pnlRows.length === 0 ? (
          <CardBody>
            <p className="text-sm text-slate-400">No data in this period.</p>
          </CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH className="text-right">Rentals</TH>
                <TH className="text-right">Revenue</TH>
                <TH className="text-right">Maintenance</TH>
                <TH className="text-right">Expenses</TH>
                <TH className="text-right">Net Profit</TH>
                <TH className="text-right">Margin</TH>
              </TR>
            </THead>
            <TBody>
              {pnlRows.map((v) => {
                const profit = v.revenue - v.maintenance - v.expenses;
                const m =
                  v.revenue > 0
                    ? Math.round((profit / v.revenue) * 100)
                    : null;
                return (
                  <TR key={v.id}>
                    <TD className="font-medium text-slate-800">{v.name}</TD>
                    <TD className="text-right text-slate-500">{v.rentals}</TD>
                    <TD className="text-right">{formatCurrency(v.revenue)}</TD>
                    <TD className="text-right text-slate-500">
                      {formatCurrency(v.maintenance)}
                    </TD>
                    <TD className="text-right text-slate-500">
                      {formatCurrency(v.expenses)}
                    </TD>
                    <TD
                      className={cn(
                        "text-right font-semibold",
                        profit >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {formatCurrency(profit)}
                    </TD>
                    <TD className="text-right text-slate-500">
                      {m === null ? "—" : `${m}%`}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

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
              <p className="text-sm text-slate-400">No outstanding balances.</p>
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
          {pnlRows.filter((v) => v.maintenance > 0).length === 0 ? (
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
                {pnlRows
                  .filter((v) => v.maintenance > 0)
                  .sort((a, b) => b.maintenance - a.maintenance)
                  .map((v) => (
                    <TR key={v.id}>
                      <TD className="font-medium text-slate-800">{v.name}</TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(v.maintenance)}
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
