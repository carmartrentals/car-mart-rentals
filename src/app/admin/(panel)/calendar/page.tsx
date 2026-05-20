import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { CalendarTimeline } from "@/components/admin/calendar-timeline";
import { RESERVATION_STATUS } from "@/lib/constants";
import { cn, rangesOverlap } from "@/lib/utils";
import type { Vehicle, ReservationWithRelations } from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | undefined>>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const now = new Date();
  const [yStr, mStr] = (sp.month ?? "").split("-");
  const year = Number(yStr) || now.getFullYear();
  const month = mStr ? Number(mStr) - 1 : now.getMonth();
  const view = sp.view === "month" ? "month" : "timeline";

  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const fmtMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  let vehicles: Vehicle[] = [];
  let reservations: ReservationWithRelations[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const [v, r] = await Promise.all([
      admin
        .from("vehicles")
        .select("*")
        .neq("status", "inactive")
        .order("make"),
      admin
        .from("reservations")
        .select("*, customer:customers(*), vehicle:vehicles(*)")
        .neq("status", "cancelled")
        .lte("pickup_at", monthEnd.toISOString())
        .gte("return_at", monthStart.toISOString()),
    ]);
    vehicles = (v.data as Vehicle[]) ?? [];
    reservations = (r.data as ReservationWithRelations[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Availability Calendar"
        subtitle="Fleet schedule, pickups, returns and bookings."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <Link
              href={`/admin/calendar?month=${fmtMonth(monthStart)}&view=timeline`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === "timeline"
                  ? "bg-brand-950 text-white"
                  : "text-slate-600",
              )}
            >
              Timeline
            </Link>
            <Link
              href={`/admin/calendar?month=${fmtMonth(monthStart)}&view=month`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === "month" ? "bg-brand-950 text-white" : "text-slate-600",
              )}
            >
              Month
            </Link>
          </div>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load calendar data. Check Supabase configuration.
          </Alert>
        </div>
      )}

      {/* Month nav + legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendar?month=${fmtMonth(prev)}&view=${view}`}
            className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="min-w-[160px] text-center text-base font-semibold text-slate-900">
            {MONTHS[month]} {year}
          </h2>
          <Link
            href={`/admin/calendar?month=${fmtMonth(next)}&view=${view}`}
            className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/calendar?month=${fmtMonth(now)}&view=${view}`}
            className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Today
          </Link>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {(["confirmed", "active", "overdue", "completed", "pending"] as const).map(
            (s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    {
                      confirmed: "bg-indigo-500",
                      active: "bg-sky-500",
                      overdue: "bg-rose-500",
                      completed: "bg-emerald-500",
                      pending: "bg-amber-400",
                    }[s],
                  )}
                />
                {RESERVATION_STATUS[s].label}
              </span>
            ),
          )}
        </div>
      </div>

      {view === "timeline" ? (
        <CalendarTimeline
          vehicles={vehicles}
          reservations={reservations}
          year={year}
          month={month}
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          reservations={reservations}
        />
      )}
    </>
  );
}

// --- Classic month grid -----------------------------------------------------
function MonthGrid({
  year,
  month,
  reservations,
}: {
  year: number;
  month: number;
  reservations: ReservationWithRelations[];
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const today = new Date();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const STATUS_BG: Record<string, string> = {
    quote: "bg-slate-100 text-slate-600",
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-indigo-100 text-indigo-800",
    active: "bg-sky-100 text-sky-800",
    overdue: "bg-rose-100 text-rose-800",
    completed: "bg-emerald-100 text-emerald-800",
  };

  function dayReservations(day: number) {
    const ds = new Date(year, month, day);
    const de = new Date(year, month, day, 23, 59, 59);
    return reservations.filter((r) =>
      rangesOverlap(r.pickup_at, r.return_at, ds, de),
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday =
            day != null &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const items = day ? dayReservations(day) : [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[112px] border-b border-r border-slate-100 p-1.5",
                !day && "bg-slate-50",
              )}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-gold-500 text-brand-950"
                        : "text-slate-500",
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((r) => (
                      <Link
                        key={r.id}
                        href={`/admin/reservations/${r.id}`}
                        className={cn(
                          "block truncate rounded px-1.5 py-0.5 text-[11px]",
                          STATUS_BG[r.status] ?? "bg-slate-100",
                        )}
                      >
                        {r.vehicle
                          ? `${r.vehicle.make} ${r.vehicle.model}`
                          : r.reservation_number}
                      </Link>
                    ))}
                    {items.length > 3 && (
                      <p className="px-1 text-[11px] text-slate-400">
                        +{items.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {reservations.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <CalendarDays className="h-4 w-4" /> No reservations this month.
        </div>
      )}
    </Card>
  );
}
