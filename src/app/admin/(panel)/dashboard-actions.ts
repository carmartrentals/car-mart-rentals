"use server";

import { getCurrentUser } from "@/lib/auth";
import { aiConfigured, answerBusinessQuestion } from "@/lib/ai";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/utils";

/** Generate a short AI summary of where the business stands today. */
export async function getDashboardBriefing(): Promise<{
  ok: boolean;
  text?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!aiConfigured()) {
    return { ok: false, error: "AI is not available right now." };
  }

  try {
    const { stats } = await getDashboardData();
    const snapshot = [
      `Today's pickups: ${stats.todayPickups}`,
      `Today's returns: ${stats.todayReturns}`,
      `Active rentals: ${stats.activeRentals}`,
      `Overdue rentals: ${stats.overdueRentals}`,
      `Available vehicles: ${stats.availableVehicles} of ${stats.fleetSize}`,
      `Vehicles in maintenance: ${stats.maintenanceVehicles}`,
      `Revenue this month: ${formatCurrency(stats.revenueThisMonth)}`,
      `Revenue last month: ${formatCurrency(stats.revenueLastMonth)}`,
      `Pending payments: ${formatCurrency(stats.pendingPaymentsAmount)} across ${stats.pendingPaymentsCount} reservation(s)`,
      `Documents awaiting verification: ${stats.pendingDocVerification}`,
      `Deposit holds nearing expiry: ${stats.expiringDepositHolds}`,
    ].join("\n");

    const text = await answerBusinessQuestion(
      [
        {
          role: "user",
          content:
            "Write a friendly 2-3 sentence briefing for the business owner " +
            "summarising today's status and pointing out what most needs " +
            "their attention.",
        },
      ],
      snapshot,
    );
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not generate the briefing.",
    };
  }
}
