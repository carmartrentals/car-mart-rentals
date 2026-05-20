"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type {
  Reservation, Vehicle, Inspection, AgreementTemplate, DamageSeverity,
} from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Payload shapes (passed from the check workflow client component)
// ---------------------------------------------------------------------------
interface DamageInput {
  location: string;
  description: string;
  severity: DamageSeverity;
  photoUrl?: string | null;
}
interface PhotoInput {
  url: string;
  category: string; // exterior | interior | damage | document
}
interface CheckoutPayload {
  odometer: number;
  fuelLevel: number;
  licenseVerified: boolean;
  insuranceVerified: boolean;
  exteriorClean: boolean;
  interiorClean: boolean;
  photos: PhotoInput[];
  damages: DamageInput[];
  customerSignatureUrl: string | null;
  staffSignatureUrl: string | null;
  notes: string;
}
interface CheckinPayload {
  odometer: number;
  fuelLevel: number;
  exteriorClean: boolean;
  interiorClean: boolean;
  photos: PhotoInput[];
  damages: DamageInput[];
  lateFee: number;
  fuelFee: number;
  cleaningFee: number;
  smokingFee: number;
  damageFee: number;
  customerSignatureUrl: string | null;
  staffSignatureUrl: string | null;
  notes: string;
  sendToMaintenance: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ===========================================================================
// CHECK-OUT — customer picks the vehicle up
// ===========================================================================
export async function submitCheckout(
  reservationId: string,
  payload: CheckoutPayload,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "checkinout")) {
    return { ok: false, error: "You do not have permission to perform check-outs." };
  }
  if (!payload.licenseVerified || !payload.insuranceVerified) {
    return { ok: false, error: "Verify the driver license and insurance before check-out." };
  }
  if (!payload.customerSignatureUrl) {
    return { ok: false, error: "A customer signature is required." };
  }
  if (!Number.isFinite(payload.odometer) || payload.odometer < 0) {
    return { ok: false, error: "Enter a valid odometer reading." };
  }

  const admin = createAdminClient();

  const { data: resRow } = await admin
    .from("reservations")
    .select("*, vehicle:vehicles(*)")
    .eq("id", reservationId)
    .maybeSingle();
  const reservation = resRow as (Reservation & { vehicle: Vehicle | null }) | null;
  if (!reservation) return { ok: false, error: "Reservation not found." };
  if (!["confirmed", "pending"].includes(reservation.status)) {
    return { ok: false, error: `This reservation is ${reservation.status} and cannot be checked out.` };
  }

  // Inspection record
  const { data: inspection, error: inspErr } = await admin
    .from("inspections")
    .insert({
      reservation_id: reservationId,
      inspection_type: "checkout",
      odometer: payload.odometer,
      fuel_level: payload.fuelLevel,
      exterior_clean: payload.exteriorClean,
      interior_clean: payload.interiorClean,
      customer_signature_url: payload.customerSignatureUrl,
      staff_signature_url: payload.staffSignatureUrl,
      inspector_id: user.id,
      notes: payload.notes || null,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (inspErr || !inspection) {
    return { ok: false, error: inspErr?.message ?? "Could not save the inspection." };
  }

  await savePhotos(admin, inspection.id, payload.photos);
  await saveDamages(admin, {
    vehicleId: reservation.vehicle_id,
    reservationId,
    inspectionId: inspection.id,
    damages: payload.damages,
  });

  // Snapshot the rental agreement from the default template
  await createAgreement(admin, reservationId);

  // Status transitions
  await admin.from("reservations").update({ status: "active" }).eq("id", reservationId);
  if (reservation.vehicle_id) {
    await admin
      .from("vehicles")
      .update({ status: "rented", odometer: payload.odometer })
      .eq("id", reservation.vehicle_id);
  }

  await logActivity({
    userId: user.id,
    action: "reservation.checked_out",
    entityType: "reservation",
    entityId: reservationId,
    description: `Checked out ${reservation.reservation_number}`,
  });

  revalidatePath(`/admin/reservations/${reservationId}`);
  revalidatePath(`/admin/check/${reservationId}`);
  revalidatePath("/admin/check");
  return { ok: true, data: { inspectionId: inspection.id } };
}

// ===========================================================================
// CHECK-IN — customer returns the vehicle
// ===========================================================================
export async function submitCheckin(
  reservationId: string,
  payload: CheckinPayload,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "checkinout")) {
    return { ok: false, error: "You do not have permission to perform check-ins." };
  }
  if (!Number.isFinite(payload.odometer) || payload.odometer < 0) {
    return { ok: false, error: "Enter a valid return odometer reading." };
  }

  const admin = createAdminClient();

  const { data: resRow } = await admin
    .from("reservations")
    .select("*, vehicle:vehicles(*)")
    .eq("id", reservationId)
    .maybeSingle();
  const reservation = resRow as (Reservation & { vehicle: Vehicle | null }) | null;
  if (!reservation) return { ok: false, error: "Reservation not found." };
  if (!["active", "overdue"].includes(reservation.status)) {
    return { ok: false, error: `This reservation is ${reservation.status} and cannot be checked in.` };
  }
  const vehicle = reservation.vehicle;

  // Baseline odometer from the check-out inspection
  const { data: checkoutInsp } = await admin
    .from("inspections")
    .select("odometer")
    .eq("reservation_id", reservationId)
    .eq("inspection_type", "checkout")
    .maybeSingle();
  const baselineOdo =
    (checkoutInsp as Inspection | null)?.odometer ?? vehicle?.odometer ?? payload.odometer;

  if (payload.odometer < baselineOdo) {
    return { ok: false, error: `Return odometer cannot be less than the check-out reading (${baselineOdo}).` };
  }

  // Extra mileage
  const milesDriven = Math.max(0, payload.odometer - baselineOdo);
  const limitPerDay = vehicle?.mileage_limit ?? 0;
  const allowance = limitPerDay > 0 ? limitPerDay * reservation.rental_days : Infinity;
  const extraMiles =
    allowance === Infinity ? 0 : Math.max(0, milesDriven - allowance);
  const extraMileageCharge = round2(extraMiles * (vehicle?.extra_mileage_fee ?? 0));

  // Inspection record
  const { data: inspection, error: inspErr } = await admin
    .from("inspections")
    .insert({
      reservation_id: reservationId,
      inspection_type: "checkin",
      odometer: payload.odometer,
      fuel_level: payload.fuelLevel,
      exterior_clean: payload.exteriorClean,
      interior_clean: payload.interiorClean,
      customer_signature_url: payload.customerSignatureUrl,
      staff_signature_url: payload.staffSignatureUrl,
      inspector_id: user.id,
      notes: payload.notes || null,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (inspErr || !inspection) {
    return { ok: false, error: inspErr?.message ?? "Could not save the inspection." };
  }

  await savePhotos(admin, inspection.id, payload.photos);
  await saveDamages(admin, {
    vehicleId: reservation.vehicle_id,
    reservationId,
    inspectionId: inspection.id,
    damages: payload.damages,
  });

  // Return charges
  const extraCharges: {
    charge_type: "mileage" | "late" | "fuel" | "cleaning" | "smoking" | "damage";
    description: string;
    amount: number;
  }[] = [];
  if (extraMileageCharge > 0)
    extraCharges.push({
      charge_type: "mileage",
      description: `Excess mileage — ${extraMiles} mi over allowance`,
      amount: extraMileageCharge,
    });
  if (payload.lateFee > 0)
    extraCharges.push({ charge_type: "late", description: "Late return fee", amount: round2(payload.lateFee) });
  if (payload.fuelFee > 0)
    extraCharges.push({ charge_type: "fuel", description: "Fuel / charging fee", amount: round2(payload.fuelFee) });
  if (payload.cleaningFee > 0)
    extraCharges.push({ charge_type: "cleaning", description: "Cleaning fee", amount: round2(payload.cleaningFee) });
  if (payload.smokingFee > 0)
    extraCharges.push({ charge_type: "smoking", description: "Smoking fee", amount: round2(payload.smokingFee) });
  if (payload.damageFee > 0)
    extraCharges.push({ charge_type: "damage", description: "Damage charge", amount: round2(payload.damageFee) });

  if (extraCharges.length > 0) {
    await admin.from("reservation_charges").insert(
      extraCharges.map((c) => ({
        reservation_id: reservationId,
        charge_type: c.charge_type,
        description: c.description,
        quantity: 1,
        unit_price: c.amount,
        amount: c.amount,
        is_taxable: false,
      })),
    );
  }

  const extrasTotal = round2(extraCharges.reduce((s, c) => s + c.amount, 0));
  const newFeesTotal = round2(reservation.fees_total + extrasTotal);
  const newTotal = round2(reservation.total + extrasTotal);
  const newBalance = round2(Math.max(0, newTotal - reservation.amount_paid));
  const paymentStatus =
    reservation.amount_paid >= newTotal
      ? "paid"
      : reservation.amount_paid > 0
        ? "partial"
        : "unpaid";

  await admin
    .from("reservations")
    .update({
      status: "completed",
      fees_total: newFeesTotal,
      total: newTotal,
      balance_due: newBalance,
      payment_status: paymentStatus,
    })
    .eq("id", reservationId);

  // Final invoice
  await admin.from("invoices").insert({
    reservation_id: reservationId,
    customer_id: reservation.customer_id,
    invoice_type: "invoice",
    subtotal: round2(newTotal - reservation.tax_amount),
    tax_amount: reservation.tax_amount,
    total: newTotal,
    amount_paid: reservation.amount_paid,
    balance: newBalance,
    status: newBalance > 0 ? "issued" : "paid",
    issued_date: new Date().toISOString().slice(0, 10),
  });

  // Vehicle status + odometer
  if (reservation.vehicle_id) {
    await admin
      .from("vehicles")
      .update({
        status: payload.sendToMaintenance ? "maintenance" : "available",
        odometer: payload.odometer,
      })
      .eq("id", reservation.vehicle_id);
  }

  await logActivity({
    userId: user.id,
    action: "reservation.checked_in",
    entityType: "reservation",
    entityId: reservationId,
    description: `Checked in ${reservation.reservation_number} — ${milesDriven} mi driven`,
  });

  revalidatePath(`/admin/reservations/${reservationId}`);
  revalidatePath(`/admin/check/${reservationId}`);
  revalidatePath("/admin/check");
  return {
    ok: true,
    data: { extraMiles, extrasTotal, newBalance },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Admin = ReturnType<typeof createAdminClient>;

async function savePhotos(admin: Admin, inspectionId: string, photos: PhotoInput[]) {
  if (!photos.length) return;
  await admin.from("inspection_photos").insert(
    photos.map((p) => ({
      inspection_id: inspectionId,
      url: p.url,
      category: p.category || "exterior",
    })),
  );
}

async function saveDamages(
  admin: Admin,
  args: {
    vehicleId: string | null;
    reservationId: string;
    inspectionId: string;
    damages: DamageInput[];
  },
) {
  if (!args.vehicleId || !args.damages.length) return;
  await admin.from("damages").insert(
    args.damages
      .filter((d) => d.location.trim())
      .map((d) => ({
        vehicle_id: args.vehicleId,
        reservation_id: args.reservationId,
        inspection_id: args.inspectionId,
        location: d.location.trim(),
        description: d.description.trim() || null,
        severity: d.severity,
        photo_urls: d.photoUrl ? [d.photoUrl] : [],
        repair_status: "reported",
      })),
  );
}

async function createAgreement(admin: Admin, reservationId: string) {
  // Skip if an agreement already exists for this reservation.
  const { data: existing } = await admin
    .from("agreements")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (existing) return;

  const { data: tplRow } = await admin
    .from("agreement_templates")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();
  const tpl = tplRow as AgreementTemplate | null;

  await admin.from("agreements").insert({
    reservation_id: reservationId,
    template_id: tpl?.id ?? null,
    title: tpl?.name ?? "Rental Agreement",
    content: tpl?.sections ?? [],
  });
}
