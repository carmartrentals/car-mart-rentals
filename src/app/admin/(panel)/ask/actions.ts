"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { aiConfigured, answerBusinessQuestion, type ChatMessage } from "@/lib/ai";
import { formatCurrency } from "@/lib/utils";

/** Answer a plain-language business question from a live data snapshot. */
export async function askBusinessQuestion(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<{ ok: boolean; answer?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!aiConfigured()) {
    return { ok: false, error: "AI is not available right now." };
  }

  const clean: ChatMessage[] = (messages ?? [])
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));

  if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
    return { ok: false, error: "Ask a question first." };
  }

  try {
    const snapshot = await buildBusinessSnapshot();
    const answer = await answerBusinessQuestion(clean, snapshot);
    return { ok: true, answer };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not answer that.",
    };
  }
}

/** Aggregate the key business numbers into a compact text snapshot. */
async function buildBusinessSnapshot(): Promise<string> {
  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const [vehiclesRes, reservationsRes, paymentsRes] = await Promise.all([
    admin.from("vehicles").select("id, year, make, model, status, daily_rate"),
    admin
      .from("reservations")
      .select(
        "id, status, total, amount_paid, balance_due, created_at, pickup_at, return_at, vehicle_id",
      ),
    admin.from("payments").select("amount, payment_type, status, created_at"),
  ]);

  const vehicles = vehiclesRes.data ?? [];
  const reservations = reservationsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  // Fleet
  const fleetByStatus: Record<string, number> = {};
  for (const v of vehicles) {
    fleetByStatus[v.status] = (fleetByStatus[v.status] ?? 0) + 1;
  }

  // Reservations
  const resByStatus: Record<string, number> = {};
  let bookingsThisMonth = 0;
  let bookingsLastMonth = 0;
  for (const r of reservations) {
    resByStatus[r.status] = (resByStatus[r.status] ?? 0) + 1;
    const created = new Date(r.created_at);
    if (created >= monthStart) bookingsThisMonth++;
    else if (created >= lastMonthStart) bookingsLastMonth++;
  }

  // Revenue from succeeded payments
  const revenue = (from: Date, to?: Date) => {
    let sum = 0;
    for (const p of payments) {
      if (p.status !== "succeeded") continue;
      const d = new Date(p.created_at);
      if (d < from || (to && d >= to)) continue;
      const amt = Number(p.amount);
      if (p.payment_type === "payment") sum += amt;
      else if (p.payment_type === "refund") sum -= amt;
    }
    return sum;
  };
  const revThisMonth = revenue(monthStart);
  const revLastMonth = revenue(lastMonthStart, monthStart);
  const revThisYear = revenue(yearStart);
  const revAll = revenue(new Date(0));

  // Outstanding balances
  let outstanding = 0;
  let outstandingCount = 0;
  for (const r of reservations) {
    if (["confirmed", "active", "overdue"].includes(r.status)) {
      const bal = Number(r.balance_due ?? 0);
      if (bal > 0) {
        outstanding += bal;
        outstandingCount++;
      }
    }
  }

  // Upcoming activity
  let upcomingPickups = 0;
  let upcomingReturns = 0;
  let overdue = 0;
  for (const r of reservations) {
    if (["confirmed", "pending"].includes(r.status)) {
      const p = new Date(r.pickup_at);
      if (p >= now && p <= in7) upcomingPickups++;
    }
    if (r.status === "active") {
      const ret = new Date(r.return_at);
      if (ret >= now && ret <= in7) upcomingReturns++;
    }
    if (r.status === "overdue") overdue++;
  }

  // Per-vehicle performance
  const vehicleName = new Map(
    vehicles.map((v) => [v.id, `${v.year} ${v.make} ${v.model}`]),
  );
  const perVehicle = new Map<string, { revenue: number; count: number }>();
  for (const r of reservations) {
    if (!r.vehicle_id) continue;
    const e = perVehicle.get(r.vehicle_id) ?? { revenue: 0, count: 0 };
    e.revenue += Number(r.amount_paid ?? 0);
    e.count++;
    perVehicle.set(r.vehicle_id, e);
  }
  const topVehicles = [...perVehicle.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8);

  // Reviews (optional)
  let reviewLine = "";
  try {
    const { data: reviews } = await admin.from("reviews").select("rating");
    if (reviews && reviews.length) {
      const avg =
        reviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviews.length;
      reviewLine = `REVIEWS: ${reviews.length} reviews, average rating ${avg.toFixed(1)} out of 5.`;
    }
  } catch {
    /* reviews optional */
  }

  const lines: string[] = [
    `Snapshot generated: ${now.toDateString()}.`,
    `FLEET: ${vehicles.length} vehicles total — ` +
      Object.entries(fleetByStatus)
        .map(([s, n]) => `${n} ${s}`)
        .join(", ") +
      ".",
    `RESERVATIONS: ${reservations.length} total — ` +
      Object.entries(resByStatus)
        .map(([s, n]) => `${n} ${s}`)
        .join(", ") +
      ".",
    `NEW BOOKINGS: ${bookingsThisMonth} created this month, ${bookingsLastMonth} last month.`,
    `REVENUE (received payments): this month ${formatCurrency(revThisMonth)}, ` +
      `last month ${formatCurrency(revLastMonth)}, ` +
      `this year ${formatCurrency(revThisYear)}, ` +
      `all-time ${formatCurrency(revAll)}.`,
    `OUTSTANDING BALANCE: ${formatCurrency(outstanding)} owed across ${outstandingCount} active/confirmed/overdue reservation(s).`,
    `NEXT 7 DAYS: ${upcomingPickups} pickup(s) scheduled, ${upcomingReturns} return(s) due. ${overdue} rental(s) currently overdue.`,
  ];
  if (topVehicles.length) {
    lines.push("TOP VEHICLES BY REVENUE (all-time, by payments received):");
    for (const [id, e] of topVehicles) {
      lines.push(
        `- ${vehicleName.get(id) ?? "Unknown vehicle"}: ${formatCurrency(e.revenue)} from ${e.count} rental(s).`,
      );
    }
  }
  if (reviewLine) lines.push(reviewLine);

  return lines.join("\n");
}
