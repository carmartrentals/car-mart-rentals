import { createAdminClient } from "@/lib/supabase/admin";

export interface UtilizationRow {
  id: string;
  name: string;
  rentals: number;
  daysRented: number;
  daysAvailable: number;
  utilization: number; // 0–100
}

export interface FleetUtilization {
  rows: UtilizationRow[]; // sorted by utilization, highest first
  average: number; // fleet-wide average utilization %
}

const DAY = 86_400_000;

/**
 * Fleet utilization = days a vehicle was on rent ÷ days it was available,
 * within [windowStart, now]. A vehicle's availability starts the later of
 * windowStart and the date the vehicle was added. Resilient — returns an
 * empty result on any failure.
 */
export async function getFleetUtilization(
  windowStart: Date,
): Promise<FleetUtilization> {
  try {
    const admin = createAdminClient();
    const now = new Date();
    const nowMs = now.getTime();
    const startMs = windowStart.getTime();

    const [vehRes, resRes] = await Promise.all([
      admin
        .from("vehicles")
        .select("id,year,make,model,created_at,status")
        .neq("status", "inactive"),
      admin
        .from("reservations")
        .select("vehicle_id,pickup_at,return_at")
        .in("status", ["confirmed", "active", "overdue", "completed"])
        .lte("pickup_at", now.toISOString())
        .gte("return_at", windowStart.toISOString())
        .limit(3000),
    ]);

    const vehicles =
      (vehRes.data as {
        id: string;
        year: number;
        make: string;
        model: string;
        created_at: string;
        status: string;
      }[]) ?? [];
    const reservations =
      (resRes.data as {
        vehicle_id: string | null;
        pickup_at: string;
        return_at: string;
      }[]) ?? [];

    // Sum rented days + rental count per vehicle.
    const rented = new Map<string, { days: number; count: number }>();
    for (const r of reservations) {
      if (!r.vehicle_id) continue;
      const pickup = new Date(r.pickup_at).getTime();
      const ret = new Date(r.return_at).getTime();
      const overlap = Math.min(ret, nowMs) - Math.max(pickup, startMs);
      if (overlap <= 0) continue;
      const cur = rented.get(r.vehicle_id) ?? { days: 0, count: 0 };
      cur.days += overlap / DAY;
      cur.count += 1;
      rented.set(r.vehicle_id, cur);
    }

    const rows: UtilizationRow[] = vehicles.map((v) => {
      const availFrom = Math.max(startMs, new Date(v.created_at).getTime());
      const daysAvailable = Math.max(1, (nowMs - availFrom) / DAY);
      const r = rented.get(v.id) ?? { days: 0, count: 0 };
      const daysRented = Math.min(r.days, daysAvailable);
      return {
        id: v.id,
        name: `${v.year} ${v.make} ${v.model}`,
        rentals: r.count,
        daysRented: Math.round(daysRented),
        daysAvailable: Math.round(daysAvailable),
        utilization: Math.min(
          100,
          Math.round((daysRented / daysAvailable) * 100),
        ),
      };
    });
    rows.sort((a, b) => b.utilization - a.utilization);

    const average =
      rows.length > 0
        ? Math.round(
            rows.reduce((s, r) => s + r.utilization, 0) / rows.length,
          )
        : 0;

    return { rows, average };
  } catch {
    return { rows: [], average: 0 };
  }
}
