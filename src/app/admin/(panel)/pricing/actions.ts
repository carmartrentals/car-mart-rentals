"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { clearPricingCache } from "@/lib/ai-pricing";
import type { ActionState } from "@/lib/form";

/**
 * Apply a pricing suggestion to a vehicle. Nulls mean "no change for this
 * bucket" — only update the buckets the AI actually suggested moving.
 */
export async function applyPricingSuggestion(
  vehicleId: string,
  rates: {
    daily?: number | null;
    weekend?: number | null;
    weekly?: number | null;
    monthly?: number | null;
  },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to change pricing." };
  }

  const update: Record<string, number> = {};
  if (rates.daily && rates.daily > 0) update.daily_rate = rates.daily;
  if (rates.weekend && rates.weekend > 0) update.weekend_rate = rates.weekend;
  if (rates.weekly && rates.weekly > 0) update.weekly_rate = rates.weekly;
  if (rates.monthly && rates.monthly > 0) update.monthly_rate = rates.monthly;
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update(update)
    .eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle.pricing_updated",
    entityType: "vehicle",
    entityId: vehicleId,
    description: `Applied AI pricing suggestion: ${JSON.stringify(update)}`,
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { ok: true };
}

/** Force a fresh AI analysis on the next page load. */
export async function refreshPricingBrief(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission." };
  }
  await clearPricingCache();
  revalidatePath("/admin/pricing");
  return { ok: true };
}
