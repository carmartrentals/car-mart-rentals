import { createAdminClient } from "@/lib/supabase/admin";
import type { Vehicle } from "@/lib/types/database";

/**
 * Pricing insights — pulls the raw demand + revenue data that feeds the AI
 * pricing analyst. All math here is deterministic; the AI only gets these
 * numbers (no raw PII) when generating its suggestions.
 */

export interface VehicleStats {
  vehicle: Vehicle;
  // Last 90 days
  past90: {
    daysBooked: number;          // total rental days
    reservationCount: number;
    revenue: number;             // sum of reservation totals
    utilization: number;         // daysBooked / 90, 0-1
    averageDailyRateAchieved: number; // revenue / daysBooked
  };
  // Next 30 days
  upcoming: {
    daysBooked: number;
    reservationCount: number;
    utilization: number; // daysBooked / 30
  };
  // Days until the vehicle next becomes available (0 = today)
  daysUntilFree: number | null;
}

export interface DemandOutlook {
  date: string;        // YYYY-MM-DD
  dayOfWeek: string;   // Mon, Tue, ...
  vehiclesBooked: number;
  vehiclesTotal: number;
}

const MS_DAY = 86_400_000;

function clampDays(start: Date, end: Date, windowStart: Date, windowEnd: Date): number {
  const s = Math.max(start.getTime(), windowStart.getTime());
  const e = Math.min(end.getTime(), windowEnd.getTime());
  if (e <= s) return 0;
  return Math.ceil((e - s) / MS_DAY);
}

/** Stats per vehicle: past 90 days + next 30 days. */
export async function getVehicleStats(): Promise<VehicleStats[]> {
  const admin = createAdminClient();
  const now = new Date();
  const past90Start = new Date(now.getTime() - 90 * MS_DAY);
  const upcomingEnd = new Date(now.getTime() + 30 * MS_DAY);

  const [vehiclesRes, pastRes, futureRes] = await Promise.all([
    admin
      .from("vehicles")
      .select("*")
      .neq("status", "inactive")
      .order("daily_rate", { ascending: false }),
    admin
      .from("reservations")
      .select("vehicle_id, pickup_at, return_at, total, status")
      .gte("pickup_at", past90Start.toISOString())
      .lte("pickup_at", now.toISOString())
      .in("status", ["active", "completed", "overdue"]),
    admin
      .from("reservations")
      .select("vehicle_id, pickup_at, return_at, status")
      .gte("return_at", now.toISOString())
      .lte("pickup_at", upcomingEnd.toISOString())
      .in("status", ["pending", "confirmed", "active", "overdue"]),
  ]);

  const vehicles = (vehiclesRes.data as Vehicle[]) ?? [];
  type ResRow = {
    vehicle_id: string | null;
    pickup_at: string;
    return_at: string;
    total?: number;
    status: string;
  };
  const past = (pastRes.data as ResRow[]) ?? [];
  const future = (futureRes.data as ResRow[]) ?? [];

  return vehicles.map((v) => {
    // Past 90 days
    let daysBooked90 = 0;
    let revenue90 = 0;
    let count90 = 0;
    for (const r of past) {
      if (r.vehicle_id !== v.id) continue;
      const days = clampDays(
        new Date(r.pickup_at),
        new Date(r.return_at),
        past90Start,
        now,
      );
      if (days > 0) {
        daysBooked90 += days;
        revenue90 += Number(r.total ?? 0);
        count90 += 1;
      }
    }

    // Next 30 days
    let daysBookedNext = 0;
    let countNext = 0;
    let nextAvailable: Date | null = null;
    for (const r of future) {
      if (r.vehicle_id !== v.id) continue;
      const days = clampDays(
        new Date(r.pickup_at),
        new Date(r.return_at),
        now,
        upcomingEnd,
      );
      if (days > 0) {
        daysBookedNext += days;
        countNext += 1;
        // If currently rented, track when it returns.
        const pickup = new Date(r.pickup_at);
        const ret = new Date(r.return_at);
        if (pickup <= now && ret > now) {
          if (!nextAvailable || ret > nextAvailable) nextAvailable = ret;
        }
      }
    }
    const daysUntilFree = nextAvailable
      ? Math.max(0, Math.ceil((nextAvailable.getTime() - now.getTime()) / MS_DAY))
      : 0;

    return {
      vehicle: v,
      past90: {
        daysBooked: daysBooked90,
        reservationCount: count90,
        revenue: Math.round(revenue90 * 100) / 100,
        utilization: Math.round((daysBooked90 / 90) * 100) / 100,
        averageDailyRateAchieved:
          daysBooked90 > 0
            ? Math.round((revenue90 / daysBooked90) * 100) / 100
            : 0,
      },
      upcoming: {
        daysBooked: daysBookedNext,
        reservationCount: countNext,
        utilization: Math.round((daysBookedNext / 30) * 100) / 100,
      },
      daysUntilFree: nextAvailable ? daysUntilFree : null,
    };
  });
}

/** Per-day fleet occupancy outlook for the next 14 days. */
export async function getDemandOutlook(
  days = 14,
): Promise<DemandOutlook[]> {
  const admin = createAdminClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + days * MS_DAY);

  const [vehCount, resRes] = await Promise.all([
    admin
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .neq("status", "inactive"),
    admin
      .from("reservations")
      .select("vehicle_id, pickup_at, return_at, status")
      .gte("return_at", start.toISOString())
      .lte("pickup_at", end.toISOString())
      .in("status", ["pending", "confirmed", "active", "overdue"]),
  ]);

  const totalVehicles = vehCount.count ?? 0;
  const reservations =
    (resRes.data as {
      vehicle_id: string | null;
      pickup_at: string;
      return_at: string;
    }[]) ?? [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: DemandOutlook[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * MS_DAY);
    const dayEnd = new Date(day.getTime() + MS_DAY);
    const booked = new Set<string>();
    for (const r of reservations) {
      const p = new Date(r.pickup_at);
      const rt = new Date(r.return_at);
      if (p < dayEnd && rt > day && r.vehicle_id) booked.add(r.vehicle_id);
    }
    result.push({
      date: day.toISOString().slice(0, 10),
      dayOfWeek: dayNames[day.getDay()],
      vehiclesBooked: booked.size,
      vehiclesTotal: totalVehicles,
    });
  }
  return result;
}
