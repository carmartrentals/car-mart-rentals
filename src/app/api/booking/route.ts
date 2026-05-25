import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeReservationTotals } from "@/lib/pricing";
import { getTaxRate } from "@/lib/data/settings";
import { notifyCustomer, notifyCompany } from "@/lib/notifications";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AddOn, Vehicle, PromoCode } from "@/lib/types/database";

const bookingSchema = z.object({
  vehicle_id: z.string().uuid(),
  pickup_at: z.string().datetime(),
  return_at: z.string().datetime(),
  add_on_ids: z.array(z.string().uuid()).default([]),
  customer: z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    email: z.string().email(),
    phone: z.string().min(7).max(30),
    dl_number: z.string().max(40).optional().or(z.literal("")),
    dl_state: z.string().max(20).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  }),
  referral_code: z.string().max(40).optional().or(z.literal("")),
  promo_code: z.string().max(40).optional().nullable(),
});

/**
 * Public booking endpoint. Creates a `pending` reservation from the website.
 * No payment is taken here — staff confirm and collect payment afterwards.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(`booking:${clientIp(request)}`, 8, 300))) {
    return NextResponse.json(
      { error: "Too many booking attempts — please wait a few minutes." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  if (new Date(input.return_at) <= new Date(input.pickup_at)) {
    return NextResponse.json(
      { error: "Return date must be after pickup date." },
      { status: 422 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Booking is temporarily unavailable. Please call us." },
      { status: 503 },
    );
  }

  // --- Load vehicle ---------------------------------------------------------
  const { data: vehicleRow, error: vErr } = await admin
    .from("vehicles")
    .select("*")
    .eq("id", input.vehicle_id)
    .maybeSingle();
  if (vErr || !vehicleRow) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }
  const vehicle = vehicleRow as Vehicle;
  if (["inactive", "maintenance"].includes(vehicle.status)) {
    return NextResponse.json(
      { error: "This vehicle is not currently available." },
      { status: 409 },
    );
  }

  // --- Availability check ---------------------------------------------------
  const { data: available } = await admin.rpc("is_vehicle_available", {
    p_vehicle_id: input.vehicle_id,
    p_start: input.pickup_at,
    p_end: input.return_at,
  });
  if (available === false) {
    return NextResponse.json(
      { error: "This vehicle is already booked for the selected dates." },
      { status: 409 },
    );
  }

  // --- Add-ons --------------------------------------------------------------
  let addOns: AddOn[] = [];
  if (input.add_on_ids.length) {
    const { data } = await admin
      .from("add_ons")
      .select("*")
      .in("id", input.add_on_ids)
      .eq("is_active", true);
    addOns = (data as AddOn[]) ?? [];
  }

  // --- Pricing --------------------------------------------------------------
  const taxRate = await getTaxRate();
  const pricing = computeReservationTotals({
    vehicle,
    pickupAt: input.pickup_at,
    returnAt: input.return_at,
    addOns: addOns.map((a) => ({ price: a.price, price_type: a.price_type })),
    taxRatePercent: taxRate,
  });

  // --- Promo code (re-validated server-side, never trust client) -----------
  let appliedPromo: PromoCode | null = null;
  let promoDiscount = 0;
  let promoFinalTotal = pricing.total;
  let promoFinalTax = pricing.taxAmount;
  let promoFinalSubtotal = pricing.subtotal;
  const promoInput = (input.promo_code ?? "").trim().toUpperCase();
  if (promoInput) {
    const { data: pRow } = await admin
      .from("promo_codes")
      .select("*")
      .ilike("code", promoInput)
      .maybeSingle();
    const p = pRow as PromoCode | null;
    const now = new Date();
    const eligible =
      p &&
      p.is_active &&
      (!p.valid_from || new Date(p.valid_from) <= now) &&
      (!p.valid_until || new Date(p.valid_until) >= now) &&
      (p.max_uses === null ||
        p.max_uses === undefined ||
        p.times_used < p.max_uses) &&
      (!p.min_rental_days || pricing.rentalDays >= p.min_rental_days);
    if (eligible && p) {
      const preTaxSubtotal = pricing.subtotal;
      const value = Number(p.discount_value);
      promoDiscount =
        p.discount_type === "percentage"
          ? Math.round(((preTaxSubtotal * value) / 100) * 100) / 100
          : Math.min(preTaxSubtotal, Math.round(value * 100) / 100);
      promoFinalSubtotal = Math.max(0, preTaxSubtotal - promoDiscount);
      promoFinalTax = Math.round(promoFinalSubtotal * (taxRate / 100) * 100) / 100;
      promoFinalTotal =
        Math.round((promoFinalSubtotal + promoFinalTax) * 100) / 100;
      appliedPromo = p;
    }
  }

  // --- Find or create customer ---------------------------------------------
  const email = input.customer.email.toLowerCase();
  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created, error: cErr } = await admin
      .from("customers")
      .insert({
        first_name: input.customer.first_name,
        last_name: input.customer.last_name,
        email,
        phone: input.customer.phone,
        dl_number: input.customer.dl_number || null,
        dl_state: input.customer.dl_state || null,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return NextResponse.json(
        { error: "Could not create customer record." },
        { status: 500 },
      );
    }
    customerId = created.id;
  }

  // --- Create reservation ---------------------------------------------------
  const { data: reservation, error: rErr } = await admin
    .from("reservations")
    .insert({
      customer_id: customerId,
      vehicle_id: vehicle.id,
      pickup_at: input.pickup_at,
      return_at: input.return_at,
      rate_type: pricing.rateType,
      rate_amount: pricing.rateAmount,
      rental_days: pricing.rentalDays,
      subtotal: promoFinalSubtotal,
      addons_total: pricing.addonsTotal,
      fees_total: pricing.feesTotal,
      tax_amount: promoFinalTax,
      total: promoFinalTotal,
      deposit_amount: pricing.depositAmount,
      balance_due: promoFinalTotal,
      discount_amount: promoDiscount > 0 ? promoDiscount : null,
      discount_reason: appliedPromo ? `Promo code ${appliedPromo.code}` : null,
      payment_status: "unpaid",
      status: "pending",
      source: "website",
      notes: input.customer.notes || null,
    })
    .select("id, reservation_number")
    .single();

  if (rErr || !reservation) {
    return NextResponse.json(
      { error: "Could not create reservation. Please call us to book." },
      { status: 500 },
    );
  }

  // --- Line items -----------------------------------------------------------
  type ChargeRow = {
    reservation_id: string;
    charge_type: "base_rate" | "add_on" | "discount";
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    is_taxable: boolean;
    add_on_id?: string;
  };
  const charges: ChargeRow[] = [
    {
      reservation_id: reservation.id,
      charge_type: "base_rate",
      description: `${vehicle.year} ${vehicle.make} ${vehicle.model} — ${pricing.rateType} rate`,
      quantity: pricing.rentalDays,
      unit_price: pricing.rateAmount,
      amount: pricing.rentalSubtotal,
      is_taxable: true,
    },
    ...addOns.map<ChargeRow>((a) => ({
      reservation_id: reservation.id,
      charge_type: "add_on",
      description: a.name,
      quantity: a.price_type === "per_day" ? pricing.rentalDays : 1,
      unit_price: a.price,
      amount:
        a.price_type === "per_day"
          ? a.price * pricing.rentalDays
          : a.price,
      is_taxable: true,
      add_on_id: a.id,
    })),
  ];
  if (appliedPromo && promoDiscount > 0) {
    charges.push({
      reservation_id: reservation.id,
      charge_type: "discount",
      description: `Promo code ${appliedPromo.code}${
        appliedPromo.description ? ` — ${appliedPromo.description}` : ""
      }`,
      quantity: 1,
      unit_price: -promoDiscount,
      amount: -promoDiscount,
      is_taxable: false,
    });
  }
  await admin.from("reservation_charges").insert(charges);

  if (appliedPromo) {
    await admin
      .from("promo_codes")
      .update({ times_used: appliedPromo.times_used + 1 })
      .eq("id", appliedPromo.id);
  }

  await admin.from("activity_logs").insert({
    action: "reservation.created",
    entity_type: "reservation",
    entity_id: reservation.id,
    description: `Website booking ${reservation.reservation_number}`,
  });

  // Mark any abandoned-booking drafts for this customer as converted.
  await admin
    .from("booking_drafts")
    .update({ status: "converted" })
    .eq("email", email)
    .eq("status", "open");

  // --- Referral -------------------------------------------------------------
  const refCode = (input.referral_code ?? "").trim().toUpperCase();
  if (refCode) {
    const { data: referrer } = await admin
      .from("customers")
      .select("id, first_name, last_name")
      .eq("referral_code", refCode)
      .maybeSingle();
    if (referrer && referrer.id !== customerId) {
      await admin.from("referrals").insert({
        referrer_id: referrer.id,
        referred_customer_id: customerId,
        referred_name: `${input.customer.first_name} ${input.customer.last_name}`,
        reservation_id: reservation.id,
        status: "pending",
      });
      await notifyCompany({
        type: "referral_booking",
        subject: `🎁 Referral booking — ${reservation.reservation_number}`,
        heading: "Referral Booking",
        intro: `${input.customer.first_name} ${input.customer.last_name} booked using a referral code from ${referrer.first_name} ${referrer.last_name}. Apply the referral reward to both customers once this rental is complete.`,
        rows: [
          {
            label: "New customer",
            value: `${input.customer.first_name} ${input.customer.last_name}`,
          },
          {
            label: "Referred by",
            value: `${referrer.first_name} ${referrer.last_name}`,
          },
          { label: "Reservation", value: reservation.reservation_number },
        ],
        cta: {
          label: "Open in Admin Panel",
          path: `/admin/reservations/${reservation.id}`,
        },
        reservationId: reservation.id,
        customerId,
      });
    }
  }

  // Booking confirmation email to the customer (best-effort)
  await notifyCustomer({
    type: "booking_confirmation",
    to: email,
    subject: `🚗 Booking received — ${reservation.reservation_number}`,
    heading: "We've Received Your Booking",
    intro: `Hi ${input.customer.first_name}, thank you for your booking. Your reservation request is in — our team will review it and confirm it shortly.`,
    rows: [
      { label: "Reservation", value: reservation.reservation_number },
      {
        label: "Vehicle",
        value: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      },
      { label: "Pickup", value: formatDateTime(input.pickup_at) },
      { label: "Return", value: formatDateTime(input.return_at) },
      ...(appliedPromo
        ? [
            {
              label: "Promo code",
              value: `${appliedPromo.code} (−${formatCurrency(promoDiscount)})`,
            },
          ]
        : []),
      { label: "Estimated total", value: formatCurrency(promoFinalTotal) },
    ],
    imageUrl: vehicle.main_image_url,
    reservationId: reservation.id,
    customerId,
  });

  // Internal alert to the company (best-effort)
  await notifyCompany({
    type: "new_booking",
    subject: `🚗 New Website Booking — ${reservation.reservation_number}`,
    heading: "New Website Booking",
    intro: `${input.customer.first_name} ${input.customer.last_name} booked a vehicle on your website. It is pending your confirmation.`,
    rows: [
      {
        label: "Customer",
        value: `${input.customer.first_name} ${input.customer.last_name}`,
      },
      {
        label: "Vehicle",
        value: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      },
      { label: "Reservation", value: reservation.reservation_number },
      { label: "Pickup", value: formatDateTime(input.pickup_at) },
      { label: "Return", value: formatDateTime(input.return_at) },
      ...(appliedPromo
        ? [
            {
              label: "Promo code",
              value: `${appliedPromo.code} (−${formatCurrency(promoDiscount)})`,
            },
          ]
        : []),
      { label: "Total", value: formatCurrency(promoFinalTotal) },
      { label: "Email", value: input.customer.email },
      { label: "Phone", value: input.customer.phone },
    ],
    cta: {
      label: "Open in Admin Panel",
      path: `/admin/reservations/${reservation.id}`,
    },
    imageUrl: vehicle.main_image_url,
    reservationId: reservation.id,
    customerId,
  });

  return NextResponse.json({
    ok: true,
    reservation_id: reservation.id,
    reservation_number: reservation.reservation_number,
    total: promoFinalTotal,
    discount: promoDiscount,
  });
}
