"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/account";
import { getStripe, stripeConfigured, toCents } from "@/lib/stripe";
import { uploadFile, storagePath } from "@/lib/storage";
import { getTaxRate } from "@/lib/data/settings";
import { notifyCompany } from "@/lib/notifications";
import { rentalDays, formatDateTime } from "@/lib/utils";
import type { ActionState } from "@/lib/form";

/** Customer uploads one of their own documents (license / insurance). */
export async function uploadMyDocument(formData: FormData): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  const kind = String(formData.get("kind"));
  const file = formData.get("file");
  const columns: Record<string, string> = {
    dl_front: "dl_front_url",
    dl_back: "dl_back_url",
    insurance: "insurance_doc_url",
  };
  const column = columns[kind];
  if (!column) return { ok: false, error: "Invalid document type." };
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, error: "File too large. Maximum size is 15 MB." };
  }

  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = storagePath(`customer-${customer.id}`, ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(
      "documents",
      path,
      buffer,
      file.type || "image/jpeg",
    );
    const admin = createAdminClient();
    // A new upload resets verification — staff must re-review.
    await admin
      .from("customers")
      .update({ [column]: result.url, documents_verified: false })
      .eq("id", customer.id);
    revalidatePath("/account/documents");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

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

/**
 * Records a customer request (extension or early return) for staff review.
 * Requests appear in the admin dashboard and on the reservation page.
 */
async function createReservationRequest(
  type: "extension" | "early_return",
  reservationId: string,
  requestedDate: string,
  note: string,
): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };
  if (!requestedDate) return { ok: false, error: "Please choose a date." };

  const requested = new Date(requestedDate);
  if (Number.isNaN(requested.getTime())) {
    return { ok: false, error: "Please choose a valid date." };
  }

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select(
      "id, reservation_number, pickup_at, return_at, rate_amount, addons_total, fees_total, discount_amount, total",
    )
    .eq("id", reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };

  const pickup = new Date(r.pickup_at as string);
  const currentReturn = new Date(r.return_at as string);

  if (type === "extension" && requested <= currentReturn) {
    return {
      ok: false,
      error: "An extension date must be after your current return date.",
    };
  }
  if (type === "early_return") {
    if (requested >= currentReturn) {
      return {
        ok: false,
        error: "An early return date must be before your current return date.",
      };
    }
    if (requested <= pickup) {
      return {
        ok: false,
        error: "The return date must be after your pickup date.",
      };
    }
  }

  // Don't allow stacking duplicate pending requests of the same kind.
  const { data: existing } = await admin
    .from("reservation_requests")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("request_type", type)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error:
        "You already have a pending request of this type. Our team will be in touch shortly.",
    };
  }

  // Estimate the change to the total: extra (or fewer) days at the same
  // per-day rate, plus tax. Positive = customer pays more.
  const taxRate = await getTaxRate();
  const oldDays = rentalDays(r.pickup_at as string, r.return_at as string);
  const newDays = rentalDays(r.pickup_at as string, requested.toISOString());
  const rentalDelta = Number(r.rate_amount ?? 0) * (newDays - oldDays);
  const estimatedCost =
    Math.round(rentalDelta * (1 + taxRate / 100) * 100) / 100;

  const label = type === "extension" ? "an extension" : "an early return";
  const { error } = await admin.from("reservation_requests").insert({
    reservation_id: reservationId,
    customer_id: customer.id,
    request_type: type,
    requested_at: requested.toISOString(),
    estimated_cost: estimatedCost,
    note: note.trim() || null,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  await admin.from("activity_logs").insert({
    action: `reservation.${type}_requested`,
    entity_type: "reservation",
    entity_id: reservationId,
    description: `Customer requested ${label} for ${r.reservation_number}`,
  });

  await notifyCompany({
    type: `${type}_request`,
    subject: `${
      type === "extension"
        ? "⏳ New Extension Request"
        : "↩️ New Early Return Request"
    } — ${r.reservation_number}`,
    heading:
      type === "extension"
        ? "New Extension Request"
        : "New Early Return Request",
    intro: `${customer.first_name} ${customer.last_name} has requested ${label} for reservation ${r.reservation_number}. Review it in the admin panel to approve or decline.`,
    rows: [
      {
        label: "Customer",
        value: `${customer.first_name} ${customer.last_name}`,
      },
      { label: "Reservation", value: r.reservation_number },
      {
        label: "Requested date",
        value: formatDateTime(requested.toISOString()),
      },
      ...(estimatedCost
        ? [
            {
              label: "Estimated change",
              value: `${estimatedCost >= 0 ? "+" : "-"}$${Math.abs(
                estimatedCost,
              ).toFixed(2)}`,
            },
          ]
        : []),
      ...(note.trim() ? [{ label: "Customer note", value: note.trim() }] : []),
    ],
    cta: {
      label: "Review in Admin Panel",
      path: `/admin/reservations/${reservationId}`,
    },
    reservationId,
    customerId: customer.id,
  });

  revalidatePath(`/account/reservations/${reservationId}`);
  return { ok: true };
}

/** Customer-submitted rental extension request. */
export async function requestExtension(
  reservationId: string,
  requestedReturn: string,
  note: string,
): Promise<ActionState> {
  return createReservationRequest(
    "extension",
    reservationId,
    requestedReturn,
    note,
  );
}

/** Customer-submitted early-return request. */
export async function requestEarlyReturn(
  reservationId: string,
  requestedDate: string,
  note: string,
): Promise<ActionState> {
  return createReservationRequest(
    "early_return",
    reservationId,
    requestedDate,
    note,
  );
}

/** Customer cancels their own still-pending request. */
export async function cancelReservationRequest(
  requestId: string,
): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("reservation_requests")
    .select("id, reservation_id, customer_id, status, request_type")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.customer_id !== customer.id) {
    return { ok: false, error: "Request not found." };
  }
  if (req.status !== "pending") {
    return {
      ok: false,
      error:
        "This request has already been handled and can no longer be cancelled.",
    };
  }

  const { error } = await admin
    .from("reservation_requests")
    .delete()
    .eq("id", requestId);
  if (error) return { ok: false, error: error.message };

  await admin.from("activity_logs").insert({
    action: `reservation.${req.request_type}_request_cancelled`,
    entity_type: "reservation",
    entity_id: req.reservation_id,
    description: `Customer cancelled their ${String(
      req.request_type,
    ).replace("_", " ")} request`,
  });
  revalidatePath(`/account/reservations/${req.reservation_id}`);
  return { ok: true };
}

/**
 * Customer submits a review for one of their completed rentals. Reviews are
 * created unpublished — staff approve them before they appear on the website.
 */
export async function submitMyReview(input: {
  reservationId: string;
  rating: number;
  title: string;
  comment: string;
}): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating from 1 to 5 stars." };
  }
  if (!input.comment.trim()) {
    return { ok: false, error: "Please write a short review." };
  }

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("reservations")
    .select(
      "id, status, vehicle_id, reservation_number, vehicle:vehicles(main_image_url)",
    )
    .eq("id", input.reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!r) return { ok: false, error: "Reservation not found." };
  if (r.status !== "completed") {
    return {
      ok: false,
      error: "You can review a rental once it has been completed.",
    };
  }

  // One review per reservation.
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("reservation_id", input.reservationId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "You have already reviewed this rental." };
  }

  const { error } = await admin.from("reviews").insert({
    customer_id: customer.id,
    reservation_id: input.reservationId,
    vehicle_id: r.vehicle_id,
    reviewer_name: `${customer.first_name} ${customer.last_name}`.trim(),
    rating,
    title: input.title.trim() || null,
    comment: input.comment.trim(),
    is_published: false,
  });
  if (error) return { ok: false, error: error.message };

  await admin.from("activity_logs").insert({
    action: "review.submitted",
    entity_type: "review",
    entity_id: input.reservationId,
    description: `Customer reviewed ${r.reservation_number} (${rating}★)`,
  });

  await notifyCompany({
    type: "review_submitted",
    subject: `⭐ New Customer Review — ${rating}-star`,
    heading: "New Customer Review",
    intro: `${customer.first_name} ${customer.last_name} left a ${rating}-star review for ${r.reservation_number}. Approve it to publish it on your website.`,
    rows: [
      {
        label: "Customer",
        value: `${customer.first_name} ${customer.last_name}`,
      },
      { label: "Rating", value: `${rating} out of 5 stars` },
      ...(input.title.trim()
        ? [{ label: "Title", value: input.title.trim() }]
        : []),
      { label: "Review", value: input.comment.trim() },
    ],
    cta: { label: "Approve in Admin Panel", path: "/admin/reviews" },
    imageUrl: (
      r as unknown as { vehicle?: { main_image_url: string | null } | null }
    ).vehicle?.main_image_url,
    reservationId: input.reservationId,
    customerId: customer.id,
  });

  revalidatePath(`/account/reservations/${input.reservationId}`);
  return { ok: true };
}

/** Customer updates their own profile details. */
export async function updateMyProfile(input: {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  if (!input.first_name.trim() || !input.last_name.trim()) {
    return { ok: false, error: "Please enter your first and last name." };
  }
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const admin = createAdminClient();

  // If the email changed, update the linked sign-in account too.
  if (email !== customer.email.toLowerCase() && customer.user_id) {
    const { error: authErr } = await admin.auth.admin.updateUserById(
      customer.user_id,
      { email },
    );
    if (authErr) {
      return {
        ok: false,
        error: `Could not update your email: ${authErr.message}`,
      };
    }
  }

  const { error } = await admin
    .from("customers")
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: input.phone.trim() || null,
      email,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      state: input.state.trim() || null,
      zip: input.zip.trim() || null,
    })
    .eq("id", customer.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}
