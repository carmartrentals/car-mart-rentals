import Link from "next/link";
import {
  CalendarClock, CalendarCheck, Car, Wrench, AlertTriangle,
  CreditCard, ShieldQuestion, Activity, KeyRound,
  Inbox, CalendarPlus, CalendarMinus, ClipboardCheck, UserPlus,
  ChevronRight,
} from "lucide-react";
import {
  getDashboardData, getExpiringVehicleDocuments, getPendingRequests,
} from "@/lib/data/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { AiBriefing } from "@/components/admin/ai-briefing";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/misc";
import { RESERVATION_STATUS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

const QUICK_ACTIONS = [
  { href: "/admin/reservations/new", icon: CalendarPlus, label: "New Reservation" },
  { href: "/admin/check", icon: ClipboardCheck, label: "Check-in / out" },
  { href: "/admin/customers/new", icon: UserPlus, label: "New Customer" },
  { href: "/admin/vehicles/new", icon: Car, label: "Add Vehicle" },
];

export default async function DashboardPage() {
  const [data, user, expiringDocs, pendingRequests] = await Promise.all([
    getDashboardData(),
    getCurrentUser(),
    getExpiringVehicleDocuments(),
    getPendingRequests(),
  ]);
  const { stats } = data;
  const firstName = (user?.full_name || "there").split(" ")[0];

  const attention = [
    {
      label: "Overdue rentals",
      count: stats.overdueRentals,
      href: "/admin/reservations?status=overdue",
      icon: AlertTriangle,
    },
    {
      label: "Documents awaiting verification",
      count: stats.pendingDocVerification,
      href: "/admin/customers",
      icon: ShieldQuestion,
    },
    {
      label: "Pending customer requests",
      count: pendingRequests.length,
      href: "/admin/reservations",
      icon: Inbox,
    },
    {
      label: "Deposit holds nearing expiry",
      count: stats.expiringDepositHolds,
      href: "/admin/payments",
      icon: CreditCard,
    },
    {
      label: "Vehicle document renewals",
      count: expiringDocs.length,
      href: "/admin/vehicles",
      icon: Wrench,
    },
  ].filter((a) => a.count > 0);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening at Car Mart Rentals today."
      />

      {!data.configured && (
        <div className="mb-6">
          <Alert tone="warning">
            Supabase is not configured yet. Add your credentials and run the
            migrations to see live data.
          </Alert>
        </div>
      )}

      {/* ---------------------------------------------------- QUICK ACTIONS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-gold-400 hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      {/* --------------------------------------- ACTION CENTER + BRIEFING */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-gold-600" /> Needs Your Attention
              </span>
            </CardTitle>
            {attention.length > 0 && (
              <Badge tone="amber">
                {attention.reduce((s, a) => s + a.count, 0)}
              </Badge>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {attention.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                You&apos;re all caught up — nothing needs attention right now.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <a.icon className="h-4 w-4 text-amber-500" />
                        {a.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone="amber">{a.count}</Badge>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {aiConfigured() ? (
          <AiBriefing />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-800">
              AI Daily Briefing
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Add an OpenAI key to enable an AI summary of your day.
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- STATS */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Pickups" value={stats.todayPickups}
          icon={CalendarClock} tone="blue" href="/admin/calendar" />
        <StatCard label="Today's Returns" value={stats.todayReturns}
          icon={CalendarCheck} tone="blue" href="/admin/calendar" />
        <StatCard label="Active Rentals" value={stats.activeRentals}
          icon={KeyRound} tone="green" href="/admin/reservations?status=active" />
        <StatCard label="Overdue Rentals" value={stats.overdueRentals}
          icon={AlertTriangle} tone={stats.overdueRentals > 0 ? "red" : "default"}
          href="/admin/reservations?status=overdue" />
        <StatCard label="Available Vehicles"
          value={`${stats.availableVehicles}/${stats.fleetSize}`}
          icon={Car} tone="green" href="/admin/vehicles?status=available" />
        <StatCard label="In Maintenance" value={stats.maintenanceVehicles}
          icon={Wrench} tone={stats.maintenanceVehicles > 0 ? "amber" : "default"}
          href="/admin/vehicles?status=maintenance" />
        <StatCard label="Pending Payments"
          value={formatCurrency(stats.pendingPaymentsAmount)}
          hint={`${stats.pendingPaymentsCount} reservation(s)`}
          icon={CreditCard} tone={stats.pendingPaymentsCount > 0 ? "amber" : "default"}
          href="/admin/payments" />
        <StatCard label="Docs Awaiting Verification"
          value={stats.pendingDocVerification}
          icon={ShieldQuestion}
          tone={stats.pendingDocVerification > 0 ? "amber" : "default"}
          href="/admin/customers" />
      </div>

      {/* --------------------------------------------------------- REVENUE */}
      <div className="mt-6">
        <RevenueChart
          data={data.revenueByMonth}
          thisMonth={stats.revenueThisMonth}
          lastMonth={stats.revenueLastMonth}
          thisYear={stats.revenueThisYear}
        />
      </div>

      {/* ----------------------------------------------- LISTS + ACTIVITY */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Pickups</CardTitle>
            <Badge tone="blue">{data.upcomingPickups.length}</Badge>
          </CardHeader>
          <ReservationMiniList
            items={data.upcomingPickups}
            emptyLabel="No pickups in the next 7 days."
            dateField="pickup_at"
          />
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Returns</CardTitle>
            <Badge tone="blue">{data.upcomingReturns.length}</Badge>
          </CardHeader>
          <ReservationMiniList
            items={data.upcomingReturns}
            emptyLabel="No returns in the next 7 days."
            dateField="return_at"
          />
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {data.recentActivity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet"
                description="Actions across the system will appear here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">
                        {log.description || log.action}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ----------------------------------------- CUSTOMER REQUEST DETAIL */}
      {pendingRequests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Inbox className="h-4 w-4 text-amber-600" />
                Pending Customer Requests
              </span>
            </CardTitle>
            <Badge tone="amber">{pendingRequests.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {pendingRequests.map((req) => {
                const isExt = req.request_type === "extension";
                const Icon = isExt ? CalendarPlus : CalendarMinus;
                return (
                  <li key={req.id}>
                    <Link
                      href={
                        req.reservation
                          ? `/admin/reservations/${req.reservation.id}`
                          : "/admin/reservations"
                      }
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Icon className="h-4 w-4 text-gold-600" />
                          {isExt ? "Extension Request" : "Early Return Request"}
                          {req.reservation && (
                            <span className="text-slate-400">
                              · {req.reservation.reservation_number}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {req.requested_at
                            ? `Requested date: ${formatDateTime(req.requested_at)}`
                            : "No date specified"}
                          {req.estimated_cost != null &&
                          req.estimated_cost !== 0
                            ? ` · Est. ${
                                req.estimated_cost >= 0 ? "+" : "−"
                              }${formatCurrency(Math.abs(req.estimated_cost))}`
                            : ""}
                          {req.note ? ` · ${req.note}` : ""}
                        </p>
                      </div>
                      <Badge tone="amber">Review</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function ReservationMiniList({
  items,
  emptyLabel,
  dateField,
}: {
  items: ReservationWithRelations[];
  emptyLabel: string;
  dateField: "pickup_at" | "return_at";
}) {
  if (items.length === 0) {
    return (
      <CardBody>
        <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>
      </CardBody>
    );
  }
  return (
    <CardBody className="p-0">
      <ul className="divide-y divide-slate-100">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/reservations/${r.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {r.customer
                    ? `${r.customer.first_name} ${r.customer.last_name}`
                    : "Unassigned"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {r.vehicle
                    ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                    : "—"}{" "}
                  · {formatDateTime(r[dateField])}
                </p>
              </div>
              <Badge tone={RESERVATION_STATUS[r.status].tone}>
                {RESERVATION_STATUS[r.status].label}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </CardBody>
  );
}
