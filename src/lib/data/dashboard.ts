import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityLog, ReservationWithRelations } from "@/lib/types/database";

export interface DashboardStats {
  todayPickups: number;
  todayReturns: number;
  activeRentals: number;
  overdueRentals: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  fleetSize: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueThisYear: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  pendingDeposits: number;
  pendingDocVerification: number;
  expiringDepositHolds: number;
}

export interface MonthRevenue {
  label: string;
  amount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueByMonth: MonthRevenue[];
  upcomingPickups: ReservationWithRelations[];
  upcomingReturns: ReservationWithRelations[];
  recentActivity: ActivityLog[];
  configured: boolean;
}

const EMPTY_STATS: DashboardStats = {
  todayPickups: 0,
  todayReturns: 0,
  activeRentals: 0,
  overdueRentals: 0,
  availableVehicles: 0,
  maintenanceVehicles: 0,
  fleetSize: 0,
  revenueThisMonth: 0,
  revenueLastMonth: 0,
  revenueThisYear: 0,
  pendingPaymentsCount: 0,
  pendingPaymentsAmount: 0,
  pendingDeposits: 0,
  pendingDocVerification: 0,
  expiringDepositHolds: 0,
};

const EMPTY_DATA = (configured: boolean): DashboardData => ({
  stats: EMPTY_STATS,
  revenueByMonth: [],
  upcomingPickups: [],
  upcomingReturns: [],
  recentActivity: [],
  configured,
});

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export interface ExpiringDoc {
  id: string;
  name: string;
  doc_type: string;
  expiry_date: string;
  vehicle: { id: string; year: number; make: string; model: string } | null;
}

/**
 * Vehicle documents that are already expired or expire within 30 days.
 * Resilient: returns [] if the vehicle_documents table doesn't exist yet.
 */
export async function getExpiringVehicleDocuments(): Promise<ExpiringDoc[]> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    const { data } = await admin
      .from("vehicle_documents")
      .select(
        "id,name,doc_type,expiry_date,vehicle:vehicles(id,year,make,model)",
      )
      .not("expiry_date", "is", null)
      .lte("expiry_date", cutoff.toISOString().slice(0, 10))
      .order("expiry_date");
    return (data as unknown as ExpiringDoc[]) ?? [];
  } catch {
    return [];
  }
}

export interface PendingRequest {
  id: string;
  request_type: "extension" | "early_return";
  requested_at: string | null;
  estimated_cost: number | null;
  note: string | null;
  created_at: string;
  reservation: { id: string; reservation_number: string } | null;
}

/**
 * Pending customer requests (extension / early return) awaiting staff action.
 * Resilient: returns [] if the reservation_requests table does not exist yet.
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("reservation_requests")
      .select(
        "id,request_type,requested_at,estimated_cost,note,created_at,reservation:reservations(id,reservation_number)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as unknown as PendingRequest[]) ?? [];
  } catch {
    return [];
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return EMPTY_DATA(false);
  }

  const now = new Date();
  const today = dayBounds(now);
  const nowIso = now.toISOString();

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const fiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000).toISOString();

  // Revenue window — covers both the last 6 months and the calendar year.
  const monthStart = (n: number) =>
    new Date(now.getFullYear(), now.getMonth() - n, 1);
  const sixMonthsAgo = monthStart(5);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const revenueSince = new Date(
    Math.min(sixMonthsAgo.getTime(), yearStart.getTime()),
  ).toISOString();

  const resSelect = "*, customer:customers(*), vehicle:vehicles(*)";
  const count = (q: { count: number | null }) => q.count ?? 0;

  try {
    const [
      pickups,
      returns,
      active,
      overdue,
      available,
      maintenance,
      fleet,
      payments,
      pendingPay,
      deposits,
      depositHolds,
      docs,
      activity,
    ] = await Promise.all([
      admin
        .from("reservations")
        .select(resSelect)
        .gte("pickup_at", today.start)
        .lte("pickup_at", weekEnd.toISOString())
        .in("status", ["confirmed", "pending"])
        .order("pickup_at"),
      admin
        .from("reservations")
        .select(resSelect)
        .gte("return_at", today.start)
        .lte("return_at", weekEnd.toISOString())
        .in("status", ["active", "confirmed", "overdue"])
        .order("return_at"),
      admin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      admin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .or(`status.eq.overdue,and(status.eq.active,return_at.lt.${nowIso})`),
      admin
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      admin
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("status", "maintenance"),
      admin.from("vehicles").select("id", { count: "exact", head: true }),
      admin
        .from("payments")
        .select("amount, created_at")
        .eq("payment_type", "payment")
        .eq("status", "succeeded")
        .gte("created_at", revenueSince),
      admin
        .from("reservations")
        .select("balance_due")
        .gt("balance_due", 0)
        .in("status", ["confirmed", "active", "overdue", "completed"]),
      admin
        .from("deposits")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "authorized"]),
      admin
        .from("deposits")
        .select("id", { count: "exact", head: true })
        .eq("status", "authorized")
        .lte("authorized_at", fiveDaysAgo),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("documents_verified", false),
      admin
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // --- Revenue buckets ---------------------------------------------------
    const buckets = new Map<string, number>();
    let revenueThisYear = 0;
    for (const p of payments.data ?? []) {
      const d = new Date(p.created_at as string);
      const amt = Number(p.amount ?? 0);
      buckets.set(
        `${d.getFullYear()}-${d.getMonth()}`,
        (buckets.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0) + amt,
      );
      if (d.getFullYear() === now.getFullYear()) revenueThisYear += amt;
    }
    const revenueByMonth: MonthRevenue[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = monthStart(i);
      revenueByMonth.push({
        label: m.toLocaleString("en-US", { month: "short" }),
        amount: buckets.get(`${m.getFullYear()}-${m.getMonth()}`) ?? 0,
      });
    }
    const thisKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lm = monthStart(1);
    const lastKey = `${lm.getFullYear()}-${lm.getMonth()}`;

    // --- Lists -------------------------------------------------------------
    const upcomingPickups = (pickups.data ?? []) as ReservationWithRelations[];
    const upcomingReturns = (returns.data ?? []) as ReservationWithRelations[];
    const todayPickups = upcomingPickups.filter(
      (r) => r.pickup_at >= today.start && r.pickup_at <= today.end,
    ).length;
    const todayReturns = upcomingReturns.filter(
      (r) => r.return_at >= today.start && r.return_at <= today.end,
    ).length;

    const pendingRows = pendingPay.data ?? [];

    return {
      configured: true,
      revenueByMonth,
      upcomingPickups,
      upcomingReturns,
      recentActivity: (activity.data ?? []) as ActivityLog[],
      stats: {
        todayPickups,
        todayReturns,
        activeRentals: count(active),
        overdueRentals: count(overdue),
        availableVehicles: count(available),
        maintenanceVehicles: count(maintenance),
        fleetSize: count(fleet),
        revenueThisMonth: buckets.get(thisKey) ?? 0,
        revenueLastMonth: buckets.get(lastKey) ?? 0,
        revenueThisYear,
        pendingPaymentsCount: pendingRows.length,
        pendingPaymentsAmount: pendingRows.reduce(
          (sum, r) => sum + Number(r.balance_due ?? 0),
          0,
        ),
        pendingDeposits: count(deposits),
        pendingDocVerification: count(docs),
        expiringDepositHolds: count(depositHolds),
      },
    };
  } catch (err) {
    console.error("getDashboardData:", err);
    return EMPTY_DATA(true);
  }
}
