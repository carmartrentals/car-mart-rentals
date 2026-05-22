"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saves a booking-in-progress so the reminder job can follow up if the
 * customer never completes the reservation. Best-effort — never throws.
 */
export async function saveBookingDraft(input: {
  email: string;
  firstName: string;
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
}): Promise<{ ok: boolean }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  try {
    const admin = createAdminClient();
    // Keep a single open draft per email + vehicle.
    await admin
      .from("booking_drafts")
      .delete()
      .eq("email", email)
      .eq("vehicle_id", input.vehicleId)
      .eq("status", "open");
    await admin.from("booking_drafts").insert({
      email,
      first_name: input.firstName?.trim() || null,
      vehicle_id: input.vehicleId,
      pickup_at: input.pickupAt || null,
      return_at: input.returnAt || null,
      status: "open",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
