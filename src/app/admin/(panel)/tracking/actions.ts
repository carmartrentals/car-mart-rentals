"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite } from "@/lib/auth";
import type { ActionState } from "@/lib/form";

/** Assign (or clear) the GPS device ID on a vehicle. */
export async function setVehicleGpsDevice(
  vehicleId: string,
  deviceId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to update vehicles." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update({ gps_device_id: deviceId.trim() || null })
    .eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/tracking");
  return { ok: true };
}
