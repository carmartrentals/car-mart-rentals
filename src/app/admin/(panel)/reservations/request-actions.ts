"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";

/** Approve or decline a customer reservation request (extension / early return). */
export async function resolveReservationRequest(
  id: string,
  reservationId: string,
  status: "approved" | "declined",
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return {
      ok: false,
      error: "You do not have permission to manage customer requests.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reservation_requests")
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: `reservation_request.${status}`,
    entityType: "reservation",
    entityId: reservationId,
    description: `Customer request ${status}`,
  });
  revalidatePath(`/admin/reservations/${reservationId}`);
  revalidatePath("/admin");
  return { ok: true };
}
