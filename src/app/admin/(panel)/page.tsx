import Link from "next/link";
import {
  CalendarClock, CalendarCheck, Car, Wrench, AlertTriangle,
  CircleDollarSign, CreditCard, ShieldQuestion, Activity, KeyRound,
  FileWarning, Inbox, CalendarPlus, CalendarMinus,
} from "lucide-react";
import {
  getDashboardData, getExpiringVehicleDocuments, getPendingRequests,
} from "@/lib/data/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/misc";
import { RESERVATION_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

export default async function DashboardPage() {
  const [data, user, expiringDocs, pendingRequests] = await Promise.all([
    getDashboardData(),
    getCurrentUser(),
    getExpiringVehicleDocuments(),
    getPendingRequests(),
  ]);
  const { stats } = data;
  const firstName = (user?.full_name || "there").split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening at Car Mart Rentals today."
      />

      {!data.configured && (
        <div className="mb-6">
          <Alert tone="warning">
            Supabase is not configured yet. Add your credentials to{" "}
            <code className="font-mono">.env.local</code> and run the migrations
            in <code className="font-mono">supabase/migrations</code> to see live
            data.
          </Alert>
        </div>
      )}

      {/* ----------------------------------------------------------- STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard label="Revenue This Month"
          value={formatCurrency(stats.revenueThisMonth)}
          icon={CircleDollarSign} tone="green" href="/admin/reports" />
        <StatCard label="Pending Payments"
          value={formatCurrency(stats.pendingPaymentsAmount)}
          hint={`${stats.pendingPaymentsCount} reservation(s)`}
          icon={CreditCard} tone={stats.pendingPaymentsCount > 0 ? "amber" : "default"}
          href="/admin/payments" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending Deposits" value={stats.pendingDeposits}
          icon={ShieldQuestion} tone={stats.pendingDeposits > 0 ? "amber" : "default"}
          href="/admin/payments" />
        <StatCard label="Docs Awaiting Verification"
          value={stats.pendingDocVerification}
          icon={ShieldQuestion}
          tone={stats.pendingDocVerification > 0 ? "amber" : "default"}
          href="/admin/customers" />
        <StatCard label="Fleet Size" value={stats.fleetSize}
          icon={Car} href="/admin/vehicles" />
      </div>

      {/* ----------------------------------------- CUSTOMER REQUEST ALERT */}
      {pendingRequests.length > 0 && (
        <Card className="mt-6 border-amber-300 ring-1 ring-amber-200">
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
                          {req.estimated_cost != null && req.estimated_cost !== 0
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

      {/* ------------------------------------------ DOCUMENT EXPIRY ALERT */}
      {expiringDocs.length > 0 && (
        <Card className="mt-6 border-amber-300">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-amber-600" />
                Vehicle Document Renewals
              </span>
            </CardTitle>
            <Badge tone="amber">{expiringDocs.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {expiringDocs.map((d) => {
                const days = Math.ceil(
                  (new Date(d.expiry_date).getTime() - Date.now()) /
                    86_400_000,
                );
                const expired = days < 0;
                return (
                  <li key={d.id}>
                    <Link
                      href={
                        d.vehicle
                          ? `/admin/vehicles/${d.vehicle.id}`
                          : "/admin/vehicles"
                      }
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {d.vehicle
                            ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}`
                            : "Vehicle"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {titleCase(d.doc_type.replace(/_/g, " "))} · {d.name}{" "}
                          · Expires {formatDate(d.expiry_date)}
                        </p>
                      </div>
                      <Badge tone={expired ? "red" : "amber"}>
                        {expired ? "Expired" : `${days} day${days === 1 ? "" : "s"} left`}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------------- LISTS + ACTIVITY */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Today&apos;s Pickups</CardTitle>
            <Badge tone="blue">{data.todayPickupList.length}</Badge>
          </CardHeader>
          <ReservationMiniList
            items={data.todayPickupList}
            emptyLabel="No pickups scheduled today."
            dateField="pickup_at"
          />
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Today&apos;s Returns</CardTitle>
            <Badge tone="blue">{data.todayReturnList.length}</Badge>
          </CardHeader>
          <ReservationMiniList
            items={data.todayReturnList}
            emptyLabel="No returns scheduled today."
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
