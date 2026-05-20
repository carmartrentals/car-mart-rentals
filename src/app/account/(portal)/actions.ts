"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/account";
import { getStripe, stripeConfigured, toCents } from "@/lib/stripe";
import type { ActionState } from "@/lib/form";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/** Customer-initiated payment of their own reservation balance. */
export async function payMyBalance(reservationId: string): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };
  if (!stripeConfigured()) {
    return { ok: false, error: "Online payment is unavailable right now. Please contact us." };
  }

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select("id, reservation_number, balance_due")
    .eq("id", reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };

  const balance = Number(r.balance_due);
  if (balance <= 0) {
    return { ok: false, error: "This reservation has no balance due." };
  }

  try {
    const stripe = getStripe();
    const url = await baseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toCents(balance),
            product_data: {
              name: `Car Mart Rentals — ${r.reservation_number}`,
              description: "Rental balance payment",
            },
          },
        },
      ],
      metadata: { reservation_id: reservationId, kind: "payment" },
      success_url: `${url}/account/reservations/${reservationId}?paid=1`,
      cancel_url: `${url}/account/reservations/${reservationId}`,
    });
    return { ok: true, data: { url: session.url ?? "" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Payment error." };
  }
}

/** Customer-submitted rental extension request — recorded for staff review. */
export async function requestExtension(
  reservationId: string,
  requestedReturn: string,
  note: string,
): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select("id, reservation_number")
    .eq("id", reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };

  await admin.from("notifications").insert({
    type: "extension_request",
    channel: "email",
    recipient: "reservations@carmartrentals.com",
    subject: `Extension request — ${r.reservation_number}`,
    body: `${customer.first_name} ${customer.last_name} requested to extend ${r.reservation_number} until ${requestedReturn}. Note: ${note || "—"}`,
    status: "pending",
    reservation_id: reservationId,
    customer_id: customer.id,
  });
  await admin.from("activity_logs").insert({
    action: "reservation.extension_requested",
    entity_type: "reservation",
    entity_id: reservationId,
    description: `Customer requested extension until ${requestedReturn}`,
  });

  return { ok: true };
}
