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
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  pendingDeposits: number;
  pendingDocVerification: number;
}

export interface DashboardData {
  stats: DashboardStats;
  todayPickupList: ReservationWithRelations[];
  todayReturnList: ReservationWithRelations[];
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
  pendingPaymentsCount: 0,
  pendingPaymentsAmount: 0,
  pendingDeposits: 0,
  pendingDocVerification: 0,
};

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
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
 * Resilient: returns [] if the vehicle_documents table doesn't exist yet
 * (database not migrated to 0009).
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
  note: string | null;
  created_at: string;
  reservation: { id: string; reservation_number: string } | null;
}

/**
 * Pending customer requests (extension / early return) awaiting staff action.
 * Resilient: returns [] if the reservation_requests table does not exist yet
 * (database not migrated to 0011).
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("reservation_requests")
      .select(
        "id,request_type,requested_at,note,created_at,reservation:reservations(id,reservation_number)",
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
    return {
      stats: EMPTY_STATS,
      todayPickupList: [],
      todayReturnList: [],
      recentActivity: [],
      configured: false,
    };
  }

  const today = dayBounds();
  const nowIso = new Date().toISOString();
  const resSelect =
    "*, customer:customers(*), vehicle:vehicles(*)";

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
      docs,
      activity,
    ] = await Promise.all([
      admin
        .from("reservations")
        .select(resSelect)
        .gte("pickup_at", today.start)
        .lte("pickup_at", today.end)
        .in("status", ["confirmed", "pending"])
        .order("pickup_at"),
      admin
        .from("reservations")
        .select(resSelect)
        .gte("return_at", today.start)
        .lte("return_at", today.end)
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
        .select("amount")
        .eq("payment_type", "payment")
        .eq("status", "succeeded")
        .gte("created_at", monthStart()),
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
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("documents_verified", false),
      admin
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const revenueThisMonth = (payments.data ?? []).reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0,
    );
    const pendingRows = pendingPay.data ?? [];
    const pendingPaymentsAmount = pendingRows.reduce(
      (sum, r) => sum + Number(r.balance_due ?? 0),
      0,
    );

    return {
      configured: true,
      stats: {
        todayPickups: (pickups.data ?? []).length,
        todayReturns: (returns.data ?? []).length,
        activeRentals: count(active),
        overdueRentals: count(overdue),
        availableVehicles: count(available),
        maintenanceVehicles: count(maintenance),
        fleetSize: count(fleet),
        revenueThisMonth,
        pendingPaymentsCount: pendingRows.length,
        pendingPaymentsAmount,
        pendingDeposits: count(deposits),
        pendingDocVerification: count(docs),
      },
      todayPickupList: (pickups.data ?? []) as ReservationWithRelations[],
      todayReturnList: (returns.data ?? []) as ReservationWithRelations[],
      recentActivity: (activity.data ?? []) as ActivityLog[],
    };
  } catch (err) {
    console.error("getDashboardData:", err);
    return {
      stats: EMPTY_STATS,
      todayPickupList: [],
      todayReturnList: [],
      recentActivity: [],
      configured: true,
    };
  }
}
