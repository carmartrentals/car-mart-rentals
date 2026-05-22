"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { getStripe, stripeConfigured, toCents } from "@/lib/stripe";
import { notifyCustomer } from "@/lib/notifications";
import { formatCurrency, titleCase } from "@/lib/utils";
import type { ActionState } from "@/lib/form";
import type { PaymentMethod, Deposit } from "@/lib/types/database";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
type Admin = ReturnType<typeof createAdminClient>;

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/** Recompute amount_paid / balance_due / payment_status from payment rows. */
async function recalcReservation(admin: Admin, reservationId: string) {
  const { data: res } = await admin
    .from("reservations")
    .select("total")
    .eq("id", reservationId)
    .maybeSingle();
  if (!res) return;

  const { data: pays } = await admin
    .from("payments")
    .select("amount, payment_type, status")
    .eq("reservation_id", reservationId);

  let paid = 0;
  for (const p of pays ?? []) {
    if (p.status !== "succeeded") continue;
    if (p.payment_type === "payment") paid += Number(p.amount);
    else if (p.payment_type === "refund") paid -= Number(p.amount);
  }
  paid = round2(paid);
  const total = Number(res.total);
  const balance = round2(Math.max(0, total - paid));
  const payment_status =
    paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

  await admin
    .from("reservations")
    .update({ amount_paid: paid, balance_due: balance, payment_status })
    .eq("id", reservationId);
}

// ===========================================================================
// Record a manual (cash / terminal / bank transfer) payment or refund
// ===========================================================================
export async function recordManualPayment(
  reservationId: string,
  input: {
    amount: number;
    method: PaymentMethod;
    type: "payment" | "refund";
    notes?: string;
  },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to record payments." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter a valid payment amount." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    reservation_id: reservationId,
    amount: round2(input.amount),
    payment_type: input.type,
    method: input.method,
    status: "succeeded",
    notes: input.notes || null,
    processed_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  await recalcReservation(admin, reservationId);
  await logActivity({
    userId: user.id,
    action: `payment.${input.type}`,
    entityType: "reservation",
    entityId: reservationId,
    description: `${input.type} of ${input.amount} via ${input.method}`,
  });

  // Email the customer a receipt for a recorded payment.
  if (input.type === "payment") {
    const { data: rInfo } = await admin
      .from("reservations")
      .select(
        "reservation_number, balance_due, customer:customers(first_name,email), vehicle:vehicles(main_image_url)",
      )
      .eq("id", reservationId)
      .maybeSingle();
    const info = rInfo as unknown as {
      reservation_number: string;
      balance_due: number;
      customer: { first_name: string; email: string } | null;
      vehicle: { main_image_url: string | null } | null;
    } | null;
    if (info?.customer?.email) {
      await notifyCustomer({
        type: "payment_receipt",
        to: info.customer.email,
        subject: `🧾 Payment received — ${info.reservation_number}`,
        heading: "Payment Received",
        intro: `Hi ${info.customer.first_name}, thank you — we've recorded your payment.`,
        rows: [
          { label: "Reservation", value: info.reservation_number },
          {
            label: "Amount paid",
            value: formatCurrency(round2(input.amount)),
          },
          { label: "Method", value: titleCase(input.method) },
          {
            label: "Balance remaining",
            value: formatCurrency(Number(info.balance_due ?? 0)),
          },
        ],
        cta: {
          label: "View Reservation",
          path: `/account/reservations/${reservationId}`,
        },
        imageUrl: info.vehicle?.main_image_url,
        reservationId,
      });
    }
  }

  revalidatePath(`/admin/reservations/${reservationId}`);
  return { ok: true };
}

// ===========================================================================
// Create a Stripe Checkout link for the outstanding balance
// ===========================================================================
export async function createPaymentLink(
  reservationId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to collect payments." };
  }
  if (!stripeConfigured()) {
    return { ok: false, error: "Stripe is not configured. Add your Stripe keys to enable online payments." };
  }

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select("*, customer:customers(email)")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };

  const balance = Number(r.balance_due);
  if (balance <= 0) return { ok: false, error: "This reservation has no outstanding balance." };

  try {
    const stripe = getStripe();
    const url = await baseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: r.customer?.email ?? undefined,
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
      success_url: `${url}/admin/reservations/${reservationId}?payment=success`,
      cancel_url: `${url}/admin/reservations/${reservationId}?payment=cancelled`,
    });
    return { ok: true, data: { url: session.url ?? "" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error." };
  }
}

// ===========================================================================
// Authorize a refundable security deposit (manual-capture hold)
// ===========================================================================
export async function createDepositAuthorization(
  reservationId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to manage deposits." };
  }
  if (!stripeConfigured()) {
    return { ok: false, error: "Stripe is not configured. Add your Stripe keys to enable deposits." };
  }

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select("*, customer:customers(email)")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };

  const amount = Number(r.deposit_amount);
  if (amount <= 0) return { ok: false, error: "This reservation has no deposit amount set." };

  // Reuse a pending deposit row or create one.
  const { data: existing } = await admin
    .from("deposits")
    .select("*")
    .eq("reservation_id", reservationId)
    .in("status", ["pending", "authorized"])
    .maybeSingle();
  const deposit = existing as Deposit | null;
  if (deposit?.status === "authorized") {
    return { ok: false, error: "A deposit is already authorized for this reservation." };
  }

  try {
    const stripe = getStripe();
    const url = await baseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: r.customer?.email ?? undefined,
      payment_intent_data: { capture_method: "manual" },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toCents(amount),
            product_data: {
              name: `Refundable Security Deposit — ${r.reservation_number}`,
              description: "Authorization hold, released after vehicle return",
            },
          },
        },
      ],
      metadata: { reservation_id: reservationId, kind: "deposit" },
      success_url: `${url}/admin/reservations/${reservationId}?deposit=success`,
      cancel_url: `${url}/admin/reservations/${reservationId}?deposit=cancelled`,
    });

    if (!deposit) {
      await admin.from("deposits").insert({
        reservation_id: reservationId,
        amount,
        status: "pending",
      });
    }
    return { ok: true, data: { url: session.url ?? "" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error." };
  }
}

// ===========================================================================
// Capture part or all of an authorized deposit
// ===========================================================================
export async function captureDeposit(
  depositId: string,
  amount: number,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to manage deposits." };
  }

  const admin = createAdminClient();
  const { data: depRow } = await admin
    .from("deposits")
    .select("*")
    .eq("id", depositId)
    .maybeSingle();
  const deposit = depRow as Deposit | null;
  if (!deposit) return { ok: false, error: "Deposit not found." };
  if (deposit.status !== "authorized" || !deposit.stripe_payment_intent_id) {
    return { ok: false, error: "Only an authorized deposit can be captured." };
  }
  if (amount <= 0 || amount > deposit.amount) {
    return { ok: false, error: `Capture amount must be between $0 and $${deposit.amount}.` };
  }

  try {
    const stripe = getStripe();
    await stripe.paymentIntents.capture(deposit.stripe_payment_intent_id, {
      amount_to_capture: toCents(amount),
    });
    await admin
      .from("deposits")
      .update({
        status: amount >= deposit.amount ? "captured" : "partially_captured",
        captured_amount: round2(amount),
        captured_at: new Date().toISOString(),
      })
      .eq("id", depositId);

    await logActivity({
      userId: user.id,
      action: "deposit.captured",
      entityType: "reservation",
      entityId: deposit.reservation_id,
      description: `Captured ${amount} from security deposit`,
    });
    revalidatePath(`/admin/reservations/${deposit.reservation_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error." };
  }
}

// ===========================================================================
// Release (cancel) an authorized deposit hold
// ===========================================================================
export async function releaseDeposit(depositId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to manage deposits." };
  }

  const admin = createAdminClient();
  const { data: depRow } = await admin
    .from("deposits")
    .select("*")
    .eq("id", depositId)
    .maybeSingle();
  const deposit = depRow as Deposit | null;
  if (!deposit) return { ok: false, error: "Deposit not found." };

  try {
    if (deposit.stripe_payment_intent_id && deposit.status === "authorized") {
      const stripe = getStripe();
      await stripe.paymentIntents.cancel(deposit.stripe_payment_intent_id);
    }
    await admin
      .from("deposits")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", depositId);

    await logActivity({
      userId: user.id,
      action: "deposit.released",
      entityType: "reservation",
      entityId: deposit.reservation_id,
      description: "Released security deposit hold",
    });

    // Confirm the release to the customer.
    if (deposit.reservation_id) {
      const { data: rInfo } = await admin
        .from("reservations")
        .select(
          "reservation_number, customer:customers(first_name,email), vehicle:vehicles(main_image_url)",
        )
        .eq("id", deposit.reservation_id)
        .maybeSingle();
      const info = rInfo as unknown as {
        reservation_number: string;
        customer: { first_name: string; email: string } | null;
        vehicle: { main_image_url: string | null } | null;
      } | null;
      if (info?.customer?.email) {
        await notifyCustomer({
          type: "deposit_released",
          to: info.customer.email,
          subject: `✅ Your security deposit has been released — ${info.reservation_number}`,
          heading: "Security Deposit Released",
          intro: `Hi ${info.customer.first_name}, good news — the security deposit hold on your card has been released. No charge was made; the held amount is now freed up. Depending on your bank, it can take a few business days to clear from your statement.`,
          rows: [
            { label: "Reservation", value: info.reservation_number },
            {
              label: "Amount released",
              value: formatCurrency(Number(deposit.amount ?? 0)),
            },
          ],
          cta: {
            label: "View Reservation",
            path: `/account/reservations/${deposit.reservation_id}`,
          },
          imageUrl: info.vehicle?.main_image_url,
          reservationId: deposit.reservation_id,
        });
      }
    }

    revalidatePath(`/admin/reservations/${deposit.reservation_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error." };
  }
}

// ===========================================================================
// Refund a recorded payment
// ===========================================================================
export async function refundPayment(paymentId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to issue refunds." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.payment_type !== "payment" || payment.status !== "succeeded") {
    return { ok: false, error: "Only a successful payment can be refunded." };
  }

  try {
    if (payment.stripe_payment_intent_id) {
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
      });
    }
    await admin.from("payments").insert({
      reservation_id: payment.reservation_id,
      amount: payment.amount,
      payment_type: "refund",
      method: payment.method,
      status: "succeeded",
      notes: `Refund of payment ${paymentId.slice(0, 8)}`,
      processed_by: user.id,
    });
    if (payment.reservation_id) {
      await recalcReservation(admin, payment.reservation_id);
      revalidatePath(`/admin/reservations/${payment.reservation_id}`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error." };
  }
}
