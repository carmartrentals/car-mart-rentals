"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { getTaxRate } from "@/lib/data/settings";
import { rentalDays } from "@/lib/utils";
import type { ActionState } from "@/lib/form";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Approve or decline a customer reservation request. Approving an extension
 * or early-return request automatically updates the reservation's return
 * date/time and recomputes its totals.
 */
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

  // Load the request and make sure it's still actionable.
  const { data: req } = await admin
    .from("reservation_requests")
    .select("id, request_type, requested_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) return { ok: false, error: "Request not found." };
  if (req.status !== "pending") {
    return { ok: false, error: "This request has already been resolved." };
  }

  // Approving applies the new return date and recomputes the reservation.
  if (status === "approved" && req.requested_at) {
    const { data: resv } = await admin
      .from("reservations")
      .select(
        "pickup_at, rate_amount, addons_total, fees_total, discount_amount, amount_paid",
      )
      .eq("id", reservationId)
      .maybeSingle();
    if (!resv) return { ok: false, error: "Reservation not found." };

    const taxRate = await getTaxRate();
    const newDays = rentalDays(
      resv.pickup_at as string,
      req.requested_at as string,
    );
    const rateAmount = Number(resv.rate_amount ?? 0);
    const rentalSubtotal = round2(rateAmount * newDays);
    const subtotal = round2(
      rentalSubtotal +
        Number(resv.addons_total ?? 0) +
        Number(resv.fees_total ?? 0),
    );
    const taxableBase = Math.max(
      0,
      subtotal - Number(resv.discount_amount ?? 0),
    );
    const taxAmount = round2(taxableBase * (taxRate / 100));
    const total = round2(taxableBase + taxAmount);
    const amountPaid = Number(resv.amount_paid ?? 0);
    const balanceDue = round2(Math.max(0, total - amountPaid));
    const paymentStatus =
      balanceDue <= 0
        ? amountPaid > 0
          ? "paid"
          : "unpaid"
        : amountPaid > 0
          ? "partial"
          : "unpaid";

    const { error: resvErr } = await admin
      .from("reservations")
      .update({
        return_at: req.requested_at,
        rental_days: newDays,
        subtotal,
        tax_amount: taxAmount,
        total,
        balance_due: balanceDue,
        payment_status: paymentStatus,
      })
      .eq("id", reservationId);
    if (resvErr) return { ok: false, error: resvErr.message };

    // Keep the base-rate line item in sync with the new day count.
    await admin
      .from("reservation_charges")
      .update({
        quantity: newDays,
        unit_price: rateAmount,
        amount: rentalSubtotal,
      })
      .eq("reservation_id", reservationId)
      .eq("charge_type", "base_rate");
  }

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
    description:
      status === "approved"
        ? `Approved a customer ${req.request_type.replace("_", " ")} request`
        : `Declined a customer ${req.request_type.replace("_", " ")} request`,
  });
  revalidatePath(`/admin/reservations/${reservationId}`);
  revalidatePath("/admin");
  return { ok: true };
}
