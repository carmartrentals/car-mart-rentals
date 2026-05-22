"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { reservationSchema } from "@/lib/validation";
import { computeReservationTotals } from "@/lib/pricing";
import { getTaxRate } from "@/lib/data/settings";
import { notifyCustomer } from "@/lib/notifications";
import { aiConfigured, assessBookingRisk } from "@/lib/ai";
import { formatDateTime } from "@/lib/utils";
import { BLOCKING_RESERVATION_STATUSES } from "@/lib/constants";
import { zodErrorState, fd, nullable, type ActionState } from "@/lib/form";
import type {
  Vehicle, ReservationStatus, Customer, Reservation,
} from "@/lib/types/database";

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

  // Load the reservation first so we can detect a move to "confirmed".
  const { data: beforeRow } = await admin
    .from("reservations")
    .select(
      "status, vehicle_id, reservation_number, pickup_at, return_at, customer:customers(first_name,email), vehicle:vehicles(main_image_url)",
    )
    .eq("id", reservationId)
    .maybeSingle();
  const before = beforeRow as unknown as {
    status: string;
    vehicle_id: string | null;
    reservation_number: string;
    pickup_at: string;
    return_at: string;
    customer: { first_name: string; email: string } | null;
    vehicle: { main_image_url: string | null } | null;
  } | null;

  await admin
    .from("reservations")
    .update({ status })
    .eq("id", reservationId);

  // Keep vehicle status roughly in sync.
  if (before?.vehicle_id) {
    if (status === "active") {
      await admin.from("vehicles").update({ status: "rented" }).eq("id", before.vehicle_id);
    } else if (status === "completed" || status === "cancelled" || status === "no_show") {
      await admin.from("vehicles").update({ status: "available" }).eq("id", before.vehicle_id);
    }
  }

  await logActivity({
    userId: user.id,
    action: "reservation.status_changed",
    entityType: "reservation",
    entityId: reservationId,
    description: `Status changed to ${status}`,
  });

  // Email the customer when the booking is newly confirmed.
  if (
    status === "confirmed" &&
    before &&
    before.status !== "confirmed" &&
    before.customer?.email
  ) {
    await notifyCustomer({
      type: "booking_confirmed",
      to: before.customer.email,
      subject: `✅ Your booking is confirmed — ${before.reservation_number}`,
      heading: "Your Booking Is Confirmed",
      intro: `Hi ${before.customer.first_name}, your reservation is confirmed. We look forward to seeing you at pickup.`,
      rows: [
        { label: "Reservation", value: before.reservation_number },
        { label: "Pickup", value: formatDateTime(before.pickup_at) },
        { label: "Return", value: formatDateTime(before.return_at) },
      ],
      cta: {
        label: "View Reservation",
        path: `/account/reservations/${reservationId}`,
      },
      imageUrl: before.vehicle?.main_image_url,
      reservationId,
    });
  }

  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${reservationId}`);
}

/**
 * Toggle whether proof of insurance is required for a specific reservation.
 * When required, check-out is blocked until the customer's insurance is verified.
 */
export async function setReservationInsuranceRequired(
  reservationId: string,
  required: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to edit reservations." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reservations")
    .update({ insurance_required: required })
    .eq("id", reservationId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: required
      ? "reservation.insurance_required_on"
      : "reservation.insurance_required_off",
    entityType: "reservation",
    entityId: reservationId,
  });

  revalidatePath(`/admin/reservations/${reservationId}`);
  return { ok: true };
}

type RiskVehicle = {
  year: number;
  make: string;
  model: string;
  category: string;
  daily_rate: number;
};
type RiskHistory = {
  total: number;
  completed: number;
  no_show: number;
  cancelled: number;
  overdue: number;
};

/** Build a plain-text fact sheet about a booking for the AI risk analyst. */
function buildRiskContext(
  r: Reservation & { customer: Customer | null; vehicle: RiskVehicle | null },
  history: RiskHistory,
): string {
  const now = Date.now();
  const lines: string[] = [];
  const v = r.vehicle;
  lines.push(
    v
      ? `Vehicle: ${v.year} ${v.make} ${v.model}, category ${v.category}, daily rate $${v.daily_rate}.`
      : "Vehicle: not assigned.",
  );
  lines.push(
    `Booking: $${r.total} total, ${r.rental_days} day(s), pickup ${formatDateTime(r.pickup_at)}.`,
  );
  const leadDays = Math.round(
    (new Date(r.pickup_at).getTime() - new Date(r.created_at).getTime()) /
      86400000,
  );
  lines.push(`Booked ${leadDays} day(s) before pickup. Source: ${r.source}.`);
  lines.push(
    `Payment: ${r.payment_status}; paid $${r.amount_paid} of $${r.total}; security deposit $${r.deposit_amount}.`,
  );
  const c = r.customer;
  if (c) {
    const accountAgeDays = Math.round(
      (now - new Date(c.created_at).getTime()) / 86400000,
    );
    lines.push(
      `Customer: ${c.first_name} ${c.last_name}. Customer record created ${accountAgeDays} day(s) ago.`,
    );
    if (c.date_of_birth) {
      const age = Math.floor(
        (now - new Date(c.date_of_birth).getTime()) / (365.25 * 86400000),
      );
      lines.push(`Customer age: about ${age}.`);
    } else {
      lines.push("Customer age: unknown (no date of birth on file).");
    }
    lines.push(`Has online account: ${c.user_id ? "yes" : "no"}.`);
    lines.push(
      `Driver license verification: ${c.dl_status}. Insurance verification: ${c.insurance_status}.`,
    );
    lines.push(
      `Blacklisted: ${c.is_blacklisted ? "YES" : "no"}. VIP: ${c.is_vip ? "yes" : "no"}.`,
    );
    lines.push(
      `Rental history: ${history.total} prior booking(s) — ${history.completed} completed, ${history.no_show} no-show, ${history.cancelled} cancelled, ${history.overdue} overdue.`,
    );
  } else {
    lines.push("Customer: no customer record linked to this booking.");
  }
  return lines.join("\n");
}

/** Run an AI fraud/loss risk assessment on a reservation and store it. */
export async function assessReservationRisk(
  reservationId: string,
): Promise<ActionState & { level?: string; summary?: string }> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to assess bookings." };
  }
  if (!aiConfigured()) {
    return { ok: false, error: "AI risk checks are not available right now." };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("reservations")
    .select(
      "*, customer:customers(*), vehicle:vehicles(year,make,model,category,daily_rate)",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Reservation not found." };

  const r = row as unknown as Reservation & {
    customer: Customer | null;
    vehicle: RiskVehicle | null;
  };

  const history: RiskHistory = {
    total: 0,
    completed: 0,
    no_show: 0,
    cancelled: 0,
    overdue: 0,
  };
  if (r.customer_id) {
    const { data: past } = await admin
      .from("reservations")
      .select("status")
      .eq("customer_id", r.customer_id)
      .neq("id", reservationId);
    for (const p of past ?? []) {
      history.total++;
      const s = p.status as string;
      if (s === "completed") history.completed++;
      else if (s === "no_show") history.no_show++;
      else if (s === "cancelled") history.cancelled++;
      else if (s === "overdue") history.overdue++;
    }
  }

  try {
    const assessment = await assessBookingRisk(buildRiskContext(r, history));
    await admin
      .from("reservations")
      .update({
        risk_level: assessment.level,
        risk_summary: assessment.summary,
        risk_assessed_at: new Date().toISOString(),
      })
      .eq("id", reservationId);
    await logActivity({
      userId: user.id,
      action: "reservation.risk_assessed",
      entityType: "reservation",
      entityId: reservationId,
      description: `AI risk check: ${assessment.level}`,
    });
    revalidatePath(`/admin/reservations/${reservationId}`);
    return { ok: true, level: assessment.level, summary: assessment.summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "The risk check failed.",
    };
  }
}
