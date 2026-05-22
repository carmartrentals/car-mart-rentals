import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, fromCents } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCustomer, notifyCompany } from "@/lib/notifications";
import { syncDocumentsVerified } from "@/lib/documents";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Recompute a reservation's paid / balance / status from its payment rows. */
async function recalc(admin: Admin, reservationId: string) {
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
  await admin
    .from("reservations")
    .update({
      amount_paid: paid,
      balance_due: round2(Math.max(0, total - paid)),
      payment_status: paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial",
    })
    .eq("id", reservationId);
}

/**
 * Stripe webhook — receives payment & deposit events.
 * Configure the endpoint URL and STRIPE_WEBHOOK_SECRET in the Stripe dashboard.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;
      const reservationId = session.metadata?.reservation_id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
      const amount = fromCents(session.amount_total ?? 0);

      if (reservationId && paymentIntentId && kind === "payment") {
        // Dedup by payment intent id.
        const { data: existing } = await admin
          .from("payments")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (!existing) {
          await admin.from("payments").insert({
            reservation_id: reservationId,
            amount,
            payment_type: "payment",
            method: "stripe",
            status: "succeeded",
            stripe_payment_intent_id: paymentIntentId,
            reference: session.id,
          });
          await recalc(admin, reservationId);
          await admin.from("activity_logs").insert({
            action: "payment.stripe_succeeded",
            entity_type: "reservation",
            entity_id: reservationId,
            description: `Online payment of ${amount} received`,
          });

          // Payment receipt to the customer + alert to the company
          const { data: info } = await admin
            .from("reservations")
            .select(
              "reservation_number, balance_due, customer:customers(first_name,last_name,email), vehicle:vehicles(main_image_url)",
            )
            .eq("id", reservationId)
            .maybeSingle();
          const detail = info as unknown as {
            reservation_number: string;
            balance_due: number;
            customer: {
              first_name: string;
              last_name: string;
              email: string;
            } | null;
            vehicle: { main_image_url: string | null } | null;
          } | null;
          if (detail) {
            const balance = formatCurrency(Number(detail.balance_due ?? 0));
            if (detail.customer?.email) {
              await notifyCustomer({
                type: "payment_receipt",
                to: detail.customer.email,
                subject: `🧾 Payment received — ${detail.reservation_number}`,
                heading: "Payment Received",
                intro: `Hi ${detail.customer.first_name}, thank you — your online payment has been received.`,
                rows: [
                  { label: "Reservation", value: detail.reservation_number },
                  { label: "Amount paid", value: formatCurrency(amount) },
                  { label: "Method", value: "Online card payment" },
                  { label: "Balance remaining", value: balance },
                ],
                cta: {
                  label: "View Reservation",
                  path: `/account/reservations/${reservationId}`,
                },
                imageUrl: detail.vehicle?.main_image_url,
                reservationId,
              });
            }
            await notifyCompany({
              type: "payment_received",
              subject: `💳 Online payment received — ${detail.reservation_number}`,
              heading: "Online Payment Received",
              intro: `A customer paid online for reservation ${detail.reservation_number}.`,
              rows: [
                { label: "Reservation", value: detail.reservation_number },
                { label: "Amount", value: formatCurrency(amount) },
                ...(detail.customer
                  ? [
                      {
                        label: "Customer",
                        value: `${detail.customer.first_name} ${detail.customer.last_name}`,
                      },
                    ]
                  : []),
                { label: "Balance remaining", value: balance },
              ],
              cta: {
                label: "Open in Admin Panel",
                path: `/admin/reservations/${reservationId}`,
              },
              imageUrl: detail.vehicle?.main_image_url,
              reservationId,
            });
          }
        }
      } else if (reservationId && paymentIntentId && kind === "deposit") {
        const { data: dep } = await admin
          .from("deposits")
          .select("id")
          .eq("reservation_id", reservationId)
          .eq("status", "pending")
          .maybeSingle();
        if (dep) {
          await admin
            .from("deposits")
            .update({
              status: "authorized",
              stripe_payment_intent_id: paymentIntentId,
              authorized_at: new Date().toISOString(),
            })
            .eq("id", dep.id);
        }
      }
    } else if (event.type === "identity.verification_session.verified") {
      // Stripe Identity confirmed the customer's ID document.
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const customerId = vs.metadata?.customer_id;
      if (customerId) {
        const update: Record<string, unknown> = {
          dl_status: "verified",
          dl_verification_method: "stripe_identity",
          dl_verified_at: new Date().toISOString(),
          dl_rejection_reason: null,
          stripe_verification_session_id: vs.id,
        };
        // Best-effort: copy license number / expiry from the report.
        try {
          const full = await getStripe().identity.verificationSessions.retrieve(
            vs.id,
            { expand: ["last_verification_report"] },
          );
          const report = full.last_verification_report;
          const doc =
            report && typeof report !== "string"
              ? (
                  report as unknown as {
                    document?: {
                      number?: string | null;
                      expiration_date?: {
                        day: number;
                        month: number;
                        year: number;
                      } | null;
                    };
                  }
                ).document
              : null;
          if (doc?.number) update.dl_number = doc.number;
          if (doc?.expiration_date) {
            const e = doc.expiration_date;
            update.dl_expiration = `${e.year}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`;
          }
        } catch {
          /* enrichment is optional */
        }
        await admin.from("customers").update(update).eq("id", customerId);
        await syncDocumentsVerified(admin, customerId);
        const { data: cust } = await admin
          .from("customers")
          .select("first_name, email")
          .eq("id", customerId)
          .maybeSingle();
        if (cust?.email) {
          await notifyCustomer({
            type: "license_verified",
            to: cust.email,
            subject: "✅ Your driver license is verified",
            heading: "Driver License Verified",
            intro: `Hi ${cust.first_name}, your driver license has been verified instantly — you're all set on the license side.`,
            rows: [],
            cta: { label: "View My Documents", path: "/account/documents" },
            customerId,
          });
        }
      }
    } else if (event.type === "identity.verification_session.requires_input") {
      // Stripe Identity could not verify the document automatically.
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const customerId = vs.metadata?.customer_id;
      if (customerId) {
        const reason =
          vs.last_error?.reason ??
          "We couldn't verify your license automatically. Please try again or upload photos for manual review.";
        await admin
          .from("customers")
          .update({ dl_status: "rejected", dl_rejection_reason: reason })
          .eq("id", customerId);
        await syncDocumentsVerified(admin, customerId);
        const { data: cust } = await admin
          .from("customers")
          .select("first_name, email")
          .eq("id", customerId)
          .maybeSingle();
        if (cust?.email) {
          await notifyCustomer({
            type: "license_rejected",
            to: cust.email,
            subject: "Action needed — driver license verification",
            heading: "Driver License — Action Needed",
            intro: `Hi ${cust.first_name}, we couldn't automatically verify your driver license. You can try the instant check again, or upload clear photos for our team to review manually.`,
            rows: [{ label: "Reason", value: reason }],
            cta: { label: "Try Again", path: "/account/documents" },
            customerId,
          });
        }
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
