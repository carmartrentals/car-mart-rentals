"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { reservationSchema } from "@/lib/validation";
import { computeReservationTotals } from "@/lib/pricing";
import { getTaxRate } from "@/lib/data/settings";
import { BLOCKING_RESERVATION_STATUSES } from "@/lib/constants";
import { zodErrorState, fd, nullable, type ActionState } from "@/lib/form";
import type { Vehicle, ReservationStatus } from "@/lib/types/database";

function readForm(form: FormData) {
  return {
    customer_id: fd(form, "customer_id"),
    vehicle_id: fd(form, "vehicle_id"),
    pickup_at: fd(form, "pickup_at"),
    return_at: fd(form, "return_at"),
    rate_type: fd(form, "rate_type") || "daily",
    rate_amount: fd(form, "rate_amount") || undefined,
    discount_amount: fd(form, "discount_amount") || "0",
    discount_reason: fd(form, "discount_reason"),
    status: fd(form, "status") || "pending",
    source: fd(form, "source") || "phone",
    notes: fd(form, "notes"),
    internal_notes: fd(form, "internal_notes"),
  };
}

async function priceReservation(
  admin: ReturnType<typeof createAdminClient>,
  input: ReturnType<typeof reservationSchema.parse>,
) {
  const { data: vehicleRow } = await admin
    .from("vehicles")
    .select("*")
    .eq("id", input.vehicle_id)
    .maybeSingle();
  if (!vehicleRow) return null;
  const vehicle = vehicleRow as Vehicle;

  const taxRate = await getTaxRate();
  const pricing = computeReservationTotals({
    vehicle,
    pickupAt: input.pickup_at,
    returnAt: input.return_at,
    discountAmount: input.discount_amount ?? 0,
    taxRatePercent: taxRate,
    rateTypeOverride: input.rate_amount ? input.rate_type : undefined,
    rateAmountOverride: input.rate_amount,
  });
  return { vehicle, pricing };
}

export async function createReservation(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to create reservations." };
  }

  const parsed = reservationSchema.safeParse(readForm(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const input = parsed.data;

  if (new Date(input.return_at) <= new Date(input.pickup_at)) {
    return { ok: false, error: "Return date must be after the pickup date." };
  }

  const admin = createAdminClient();

  // Availability check for blocking statuses.
  if (BLOCKING_RESERVATION_STATUSES.includes(input.status as ReservationStatus)) {
    const { data: available } = await admin.rpc("is_vehicle_available", {
      p_vehicle_id: input.vehicle_id,
      p_start: new Date(input.pickup_at).toISOString(),
      p_end: new Date(input.return_at).toISOString(),
    });
    if (available === false) {
      return {
        ok: false,
        error: "This vehicle is already booked for the selected dates.",
      };
    }
  }

  const priced = await priceReservation(admin, input);
  if (!priced) return { ok: false, error: "Selected vehicle could not be found." };
  const { vehicle, pricing } = priced;

  const { data: created, error } = await admin
    .from("reservations")
    .insert({
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id,
      pickup_at: new Date(input.pickup_at).toISOString(),
      return_at: new Date(input.return_at).toISOString(),
      rate_type: pricing.rateType,
      rate_amount: pricing.rateAmount,
      rental_days: pricing.rentalDays,
      discount_amount: pricing.discountAmount,
      discount_reason: nullable(input.discount_reason ?? ""),
      subtotal: pricing.subtotal,
      addons_total: pricing.addonsTotal,
      fees_total: pricing.feesTotal,
      tax_amount: pricing.taxAmount,
      total: pricing.total,
      deposit_amount: pricing.depositAmount,
      balance_due: pricing.total,
      payment_status: "unpaid",
      status: input.status,
      source: input.source,
      notes: nullable(input.notes ?? ""),
      internal_notes: nullable(input.internal_notes ?? ""),
      created_by: user.id,
    })
    .select("id, reservation_number")
    .single();

  if (error || !created) {
    return {
      ok: false,
      error:
        error?.message ??
        "Could not create the reservation. The vehicle may be double-booked.",
    };
  }

  await admin.from("reservation_charges").insert({
    reservation_id: created.id,
    charge_type: "base_rate",
    description: `${vehicle.year} ${vehicle.make} ${vehicle.model} — ${pricing.rateType} rate`,
    quantity: pricing.rentalDays,
    unit_price: pricing.rateAmount,
    amount: pricing.rentalSubtotal,
    is_taxable: true,
  });

  await logActivity({
    userId: user.id,
    action: "reservation.created",
    entityType: "reservation",
    entityId: created.id,
    description: `Created reservation ${created.reservation_number}`,
  });

  revalidatePath("/admin/reservations");
  redirect(`/admin/reservations/${created.id}`);
}

export async function updateReservation(
  reservationId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to edit reservations." };
  }

  const parsed = reservationSchema.safeParse(readForm(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const input = parsed.data;

  if (new Date(input.return_at) <= new Date(input.pickup_at)) {
    return { ok: false, error: "Return date must be after the pickup date." };
  }

  const admin = createAdminClient();

  if (BLOCKING_RESERVATION_STATUSES.includes(input.status as ReservationStatus)) {
    const { data: available } = await admin.rpc("is_vehicle_available", {
      p_vehicle_id: input.vehicle_id,
      p_start: new Date(input.pickup_at).toISOString(),
      p_end: new Date(input.return_at).toISOString(),
      p_exclude_reservation: reservationId,
    });
    if (available === false) {
      return {
        ok: false,
        error: "This vehicle is already booked for the selected dates.",
      };
    }
  }

  const priced = await priceReservation(admin, input);
  if (!priced) return { ok: false, error: "Selected vehicle could not be found." };
  const { pricing } = priced;

  const { data: current } = await admin
    .from("reservations")
    .select("amount_paid")
    .eq("id", reservationId)
    .maybeSingle();
  const amountPaid = Number(current?.amount_paid ?? 0);

  const { error } = await admin
    .from("reservations")
    .update({
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id,
      pickup_at: new Date(input.pickup_at).toISOString(),
      return_at: new Date(input.return_at).toISOString(),
      rate_type: pricing.rateType,
      rate_amount: pricing.rateAmount,
      rental_days: pricing.rentalDays,
      discount_amount: pricing.discountAmount,
      discount_reason: nullable(input.discount_reason ?? ""),
      subtotal: pricing.subtotal,
      tax_amount: pricing.taxAmount,
      total: pricing.total,
      deposit_amount: pricing.depositAmount,
      balance_due: Math.max(0, pricing.total - amountPaid),
      status: input.status,
      source: input.source,
      notes: nullable(input.notes ?? ""),
      internal_notes: nullable(input.internal_notes ?? ""),
    })
    .eq("id", reservationId);

  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "reservation.updated",
    entityType: "reservation",
    entityId: reservationId,
  });

  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${reservationId}`);
  redirect(`/admin/reservations/${reservationId}`);
}

/** Quick status transition from the reservation detail page. */
export async function setReservationStatus(
  reservationId: string,
  status: ReservationStatus,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) return;

  const admin = createAdminClient();
  await admin
    .from("reservations")
    .update({ status })
    .eq("id", reservationId);

  // Keep vehicle status roughly in sync.
  const { data: res } = await admin
    .from("reservations")
    .select("vehicle_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (res?.vehicle_id) {
    if (status === "active") {
      await admin.from("vehicles").update({ status: "rented" }).eq("id", res.vehicle_id);
    } else if (status === "completed" || status === "cancelled" || status === "no_show") {
      await admin.from("vehicles").update({ status: "available" }).eq("id", res.vehicle_id);
    }
  }

  await logActivity({
    userId: user.id,
    action: "reservation.status_changed",
    entityType: "reservation",
    entityId: reservationId,
    description: `Status changed to ${status}`,
  });

  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${reservationId}`);
}
