"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { notifyCustomer } from "@/lib/notifications";
import { getSetting } from "@/lib/data/settings";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/form";
import type {
  ViolationType,
  ViolationStatus,
  TollViolation,
} from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Default handling-fee markup added to each toll passed back to the renter.
 *  Reads from admin Settings -> Toll Passthrough Markup. Supports both the
 *  legacy {fee} shape and the new {flat_markup, percent_markup} shape so
 *  upgrading the Settings card doesn't break existing data. */
async function computeMarkup(tollAmount: number): Promise<number> {
  const s = await getSetting<{
    fee?: number;
    flat_markup?: number;
    percent_markup?: number;
  }>("toll_passthrough", {});
  // New shape if either new field is present, otherwise fall back to legacy.
  if (s.flat_markup !== undefined || s.percent_markup !== undefined) {
    const flat = Number(s.flat_markup ?? 0);
    const pct = Number(s.percent_markup ?? 0);
    return Math.round((flat + (tollAmount * pct) / 100) * 100) / 100;
  }
  // Legacy {fee} shape.
  return Number(s.fee ?? 5);
}

/** Wrapper kept for callers that don't have a toll amount yet (e.g. when a
 *  fee is recorded at toll-creation time before passthrough). */
async function defaultHandlingFee(): Promise<number> {
  return computeMarkup(0);
}

/**
 * Given a vehicle + the date a toll was incurred, find the reservation that
 * had that car at that moment. Returns null if no match (e.g. the toll
 * happened while the car was idle in the lot).
 */
export async function matchReservationForViolation(
  vehicleId: string | null,
  incurredDate: string,
): Promise<{
  id: string;
  reservation_number: string;
  customer_id: string | null;
  status: string;
} | null> {
  if (!vehicleId || !incurredDate) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("reservations")
    .select("id, reservation_number, customer_id, status, pickup_at, return_at")
    .eq("vehicle_id", vehicleId)
    .lte("pickup_at", `${incurredDate}T23:59:59Z`)
    .gte("return_at", `${incurredDate}T00:00:00Z`)
    .in("status", ["active", "completed", "overdue"])
    .order("pickup_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    reservation_number: data.reservation_number as string,
    customer_id: data.customer_id as string | null,
    status: data.status as string,
  };
}

export async function createViolation(input: {
  vehicle_id: string;
  violation_type: ViolationType;
  description: string;
  location: string;
  amount: number;
  incurred_date: string;
  status: ViolationStatus;
  charged_to_customer: boolean;
  reference_number: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to record violations." };
  }

  const admin = createAdminClient();
  // Auto-match the reservation that had this car on the toll date so the
  // operator can charge the customer in one click later.
  const match = await matchReservationForViolation(
    input.vehicle_id || null,
    input.incurred_date,
  );
  const handlingFee = await defaultHandlingFee();

  const { error } = await admin.from("toll_violations").insert({
    vehicle_id: input.vehicle_id || null,
    reservation_id: match?.id ?? null,
    violation_type: input.violation_type,
    description: input.description.trim() || null,
    location: input.location.trim() || null,
    amount: input.amount,
    incurred_date: input.incurred_date || new Date().toISOString().slice(0, 10),
    status: input.status,
    charged_to_customer: input.charged_to_customer,
    handling_fee: handlingFee,
    reference_number: input.reference_number.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "violation.created",
    entityType: "vehicle",
    entityId: input.vehicle_id || undefined,
  });
  revalidatePath("/admin/violations");
  return { ok: true };
}

export async function setViolationStatus(
  id: string,
  status: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to update violations." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("toll_violations")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/violations");
  return { ok: true };
}

/**
 * Pass the toll through to the renter: add toll + handling fee as a line
 * item on their reservation, recompute the balance, email a receipt.
 *
 * This is the closest thing a small operator gets to PlatePass — same
 * customer experience without the enterprise contract.
 */
export async function chargeViolationToCustomer(
  violationId: string,
  overrideHandlingFee?: number,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to charge customers." };
  }

  const admin = createAdminClient();
  const { data: vRow } = await admin
    .from("toll_violations")
    .select("*")
    .eq("id", violationId)
    .maybeSingle();
  const violation = vRow as TollViolation | null;
  if (!violation) return { ok: false, error: "Toll record not found." };
  if (violation.charged_to_customer) {
    return { ok: false, error: "This toll was already charged to the customer." };
  }

  // Ensure we have a matched reservation. If the create form already linked
  // one, use it; otherwise re-match now.
  let reservationId = violation.reservation_id;
  if (!reservationId) {
    const match = await matchReservationForViolation(
      violation.vehicle_id,
      violation.incurred_date,
    );
    if (!match) {
      return {
        ok: false,
        error:
          "No reservation was active for this vehicle on the toll date. Charge can't be auto-routed — collect manually.",
      };
    }
    reservationId = match.id;
  }

  // Pull reservation + customer for the charge + receipt.
  const { data: resRow } = await admin
    .from("reservations")
    .select(
      "id, reservation_number, total, amount_paid, balance_due, customer:customers(first_name, email)",
    )
    .eq("id", reservationId)
    .maybeSingle();
  const reservation = resRow as unknown as {
    id: string;
    reservation_number: string;
    total: number;
    amount_paid: number;
    balance_due: number;
    customer: { first_name: string; email: string } | null;
  } | null;
  if (!reservation) {
    return { ok: false, error: "Matched reservation could not be loaded." };
  }

  const tollAmount = Number(violation.amount);
  // Markup: explicit override > stored handling_fee > live computeMarkup(toll).
  // computeMarkup applies both flat + percent components from the new Settings
  // shape, so a percent-based markup scales correctly with the toll amount.
  const fee =
    overrideHandlingFee !== undefined
      ? Number(overrideHandlingFee)
      : Number(violation.handling_fee) || (await computeMarkup(tollAmount));
  const total = Math.round((tollAmount + fee) * 100) / 100;

  // 1. Add a charge line item.
  const description = `Toll passthrough · ${
    violation.location || "Unknown location"
  } (${formatDate(violation.incurred_date)})${
    fee > 0 ? ` + ${formatCurrency(fee)} handling fee` : ""
  }`;
  const { data: chargeRow, error: chargeErr } = await admin
    .from("reservation_charges")
    .insert({
      reservation_id: reservation.id,
      charge_type: "fee",
      description,
      quantity: 1,
      unit_price: total,
      amount: total,
      is_taxable: false,
    })
    .select("id")
    .single();
  if (chargeErr || !chargeRow) {
    return { ok: false, error: chargeErr?.message ?? "Could not add the charge." };
  }

  // 2. Recompute reservation totals.
  const newTotal = Number(reservation.total) + total;
  const newBalance = Math.max(0, newTotal - Number(reservation.amount_paid));
  await admin
    .from("reservations")
    .update({ total: newTotal, balance_due: newBalance })
    .eq("id", reservation.id);

  // 3. Mark the violation as charged.
  await admin
    .from("toll_violations")
    .update({
      charged_to_customer: true,
      status: "charged_to_customer",
      reservation_id: reservation.id,
      handling_fee: fee,
      customer_charge_total: total,
      customer_charge_id: chargeRow.id,
      customer_charged_at: new Date().toISOString(),
    })
    .eq("id", violationId);

  // 4. Email the customer a receipt.
  if (reservation.customer?.email) {
    await notifyCustomer({
      type: "toll_charge",
      to: reservation.customer.email,
      subject: `Toll charge added to your rental — ${reservation.reservation_number}`,
      heading: "A toll was added to your rental",
      intro: `Hi ${reservation.customer.first_name}, a toll incurred during your recent rental has been added to your reservation. The amount below has been billed to your card on file.`,
      rows: [
        { label: "Reservation", value: reservation.reservation_number },
        { label: "Toll location", value: violation.location || "—" },
        { label: "Date", value: formatDate(violation.incurred_date) },
        { label: "Toll amount", value: formatCurrency(tollAmount) },
        ...(fee > 0
          ? [{ label: "Handling fee", value: formatCurrency(fee) }]
          : []),
        { label: "Total charged", value: formatCurrency(total) },
      ],
      cta: {
        label: "View Reservation",
        path: `/account/reservations/${reservation.id}`,
      },
      reservationId: reservation.id,
    });
  }

  await logActivity({
    userId: user.id,
    action: "violation.charged_customer",
    entityType: "reservation",
    entityId: reservation.id,
    description: `${formatCurrency(total)} toll passthrough · ${
      violation.location || "Unknown"
    }`,
  });

  revalidatePath("/admin/violations");
  revalidatePath(`/admin/reservations/${reservation.id}`);
  return { ok: true };
}

/**
 * Delete a toll/violation row. If it was already charged to a customer
 * (creating a reservation_charges line item), this also reverses that
 * charge and recomputes the reservation balance — so the operator can
 * undo a mis-billed toll cleanly in one click.
 */
export async function deleteViolation(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to delete violations." };
  }

  const admin = createAdminClient();
  const { data: vRow } = await admin
    .from("toll_violations")
    .select("id, customer_charge_id, customer_charge_total, reservation_id")
    .eq("id", id)
    .maybeSingle();
  const violation = vRow as {
    id: string;
    customer_charge_id: string | null;
    customer_charge_total: number | null;
    reservation_id: string | null;
  } | null;
  if (!violation) return { ok: false, error: "Toll record not found." };

  // If we previously billed the customer, reverse that charge and recompute
  // the reservation balance so deleting the toll doesn't leave a phantom
  // line item behind.
  if (violation.customer_charge_id && violation.reservation_id) {
    await admin
      .from("reservation_charges")
      .delete()
      .eq("id", violation.customer_charge_id);

    const { data: resRow } = await admin
      .from("reservations")
      .select("total, amount_paid")
      .eq("id", violation.reservation_id)
      .maybeSingle();
    if (resRow) {
      const reversed = Number(violation.customer_charge_total ?? 0);
      const newTotal = Math.max(0, Number(resRow.total) - reversed);
      const newBalance = Math.max(0, newTotal - Number(resRow.amount_paid));
      await admin
        .from("reservations")
        .update({ total: newTotal, balance_due: newBalance })
        .eq("id", violation.reservation_id);
    }
  }

  const { error } = await admin
    .from("toll_violations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "violation.deleted",
    entityType: "vehicle",
  });
  revalidatePath("/admin/violations");
  return { ok: true };
}

/** Save the default handling-fee setting from the admin UI. */
export async function saveTollHandlingFee(fee: number): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can change this." };
  }
  if (!Number.isFinite(fee) || fee < 0) {
    return { ok: false, error: "Enter a valid fee amount." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("settings").upsert(
    { key: "toll_passthrough", value: { fee } },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/violations");
  return { ok: true };
}

// Re-export so the helper can be used from server components.
export async function getDefaultHandlingFee(): Promise<number> {
  return defaultHandlingFee();
}

// Used by the violations page to suppress unused-import warnings.
export type { Admin };
