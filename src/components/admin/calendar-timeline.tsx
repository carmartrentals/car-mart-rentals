import Link from "next/link";
import { cn } from "@/lib/utils";
import { RESERVATION_STATUS } from "@/lib/constants";
import type { Vehicle, ReservationWithRelations } from "@/lib/types/database";

const STATUS_BG: Record<string, string> = {
  quote: "bg-slate-400",
  pending: "bg-amber-400",
  confirmed: "bg-indigo-500",
  active: "bg-sky-500",
  overdue: "bg-rose-500",
  completed: "bg-emerald-500",
  no_show: "bg-rose-300",
  cancelled: "bg-slate-300",
};

/**
 * Fleet timeline (Gantt-style). Each row is a vehicle; reservations are
 * placed across day columns via CSS grid column spans.
 */
export function CalendarTimeline({
  vehicles,
  reservations,
  year,
  month,
}: {
  vehicles: Vehicle[];
  reservations: ReservationWithRelations[];
  year: number;
  month: number; // 0-indexed
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const byVehicle = new Map<string, ReservationWithRelations[]>();
  for (const r of reservations) {
    if (!r.vehicle_id) continue;
    const list = byVehicle.get(r.vehicle_id) ?? [];
    list.push(r);
    byVehicle.set(r.vehicle_id, list);
  }

  function span(r: ReservationWithRelations) {
    const s = new Date(r.pickup_at);
    const e = new Date(r.return_at);
    const startDay = s < monthStart ? 1 : s.getDate();
    const endDay = e > monthEnd ? daysInMonth : e.getDate();
    return { startDay, endDay: Math.max(startDay, endDay) };
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="min-w-[820px]">
        {/* Header */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-52 shrink-0 border-r border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vehicle
          </div>
          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0,1fr))` }}
          >
            {days.map((d) => {
              const dow = new Date(year, month, d).getDay();
              const weekend = dow === 0 || dow === 6;
              const isToday = isThisMonth && d === today.getDate();
              return (
                <div
                  key={d}
                  className={cn(
                    "border-r border-slate-100 py-2 text-center text-[11px]",
                    weekend ? "bg-slate-100 text-slate-400" : "text-slate-500",
                    isToday && "bg-gold-100 font-bold text-gold-800",
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {vehicles.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No vehicles to display.
          </p>
        ) : (
          vehicles.map((v) => {
            const items = byVehicle.get(v.id) ?? [];
            return (
              <div
                key={v.id}
                className="flex border-b border-slate-100 last:border-0"
              >
                <Link
                  href={`/admin/vehicles/${v.id}`}
                  className="w-52 shrink-0 border-r border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <p className="truncate text-sm font-medium text-slate-800">
                    {v.year} {v.make} {v.model}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {v.license_plate || v.color || "—"}
                  </p>
                </Link>
                <div
                  className="relative grid flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${daysInMonth}, minmax(0,1fr))`,
                  }}
                >
                  {/* day grid lines */}
                  {days.map((d) => {
                    const dow = new Date(year, month, d).getDay();
                    const weekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={d}
                        className={cn(
                          "h-12 border-r border-slate-100",
                          weekend && "bg-slate-50",
                        )}
                      />
                    );
                  })}
                  {/* reservation bars */}
                  {items.map((r) => {
                    const { startDay, endDay } = span(r);
                    return (
                      <Link
                        key={r.id}
                        href={`/admin/reservations/${r.id}`}
                        title={`${r.reservation_number} · ${
                          r.customer
                            ? `${r.customer.first_name} ${r.customer.last_name}`
                            : "—"
                        } · ${RESERVATION_STATUS[r.status].label}`}
                        className={cn(
                          "z-10 my-2 flex items-center overflow-hidden rounded px-2 text-[11px] font-medium text-white",
                          STATUS_BG[r.status] ?? "bg-slate-400",
                        )}
                        style={{
                          gridColumn: `${startDay} / ${endDay + 1}`,
                          gridRow: 1,
                        }}
                      >
                        <span className="truncate">
                          {r.customer
                            ? `${r.customer.first_name} ${r.customer.last_name}`
                            : r.reservation_number}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
