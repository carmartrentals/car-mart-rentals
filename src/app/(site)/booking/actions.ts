"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/account";
import type { PromoCode } from "@/lib/types/database";

export interface PromoValidation {
  ok: boolean;
  error?: string;
  discountAmount?: number; // dollars, applied to subtotal+addons (pre-tax)
  code?: string;
  description?: string | null;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
}

/**
 * Validate a customer-entered promo code against the active promo_codes
 * table. Returns the dollar discount that should be subtracted from the
 * pre-tax subtotal. Pure check — does NOT consume the code; the booking
 * API increments times_used when the reservation is actually created.
 */
export async function validatePromoCode(input: {
  code: string;
  rentalDays: number;
  subtotalBeforeDiscount: number; // rental + addons, pre-tax
}): Promise<PromoValidation> {
  const code = (input.code || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code." };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("promo_codes")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    const promo = data as PromoCode | null;

    if (!promo) return { ok: false, error: "That code isn't valid." };
    if (!promo.is_active) return { ok: false, error: "That code is no longer active." };

    // CUSTOMER SCOPING — when promo.customer_id is set, only that
    // specific signed-in customer may redeem. Prevents a leaked
    // BIRTHDAY15-style code from being used by anyone who guesses it.
    if (promo.customer_id) {
      const signedInCustomer = await getCurrentCustomer();
      if (!signedInCustomer) {
        return {
          ok: false,
          error: "That code is personal — sign in with the account that received it.",
        };
      }
      if (signedInCustomer.id !== promo.customer_id) {
        // Deliberately vague — don't confirm whether the code exists,
        // just say it's not for this account.
        return {
          ok: false,
          error: "That code isn't valid for this account.",
        };
      }
    }

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { ok: false, error: "That code isn't active yet." };
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return { ok: false, error: "That code has expired." };
    }
    if (
      promo.max_uses !== null &&
      promo.max_uses !== undefined &&
      promo.times_used >= promo.max_uses
    ) {
      return { ok: false, error: "That code has reached its usage limit." };
    }
    if (
      promo.min_rental_days &&
      input.rentalDays < promo.min_rental_days
    ) {
      return {
        ok: false,
        error: `Requires a minimum ${promo.min_rental_days}-day rental.`,
      };
    }

    const value = Number(promo.discount_value);
    const sub = Math.max(0, Number(input.subtotalBeforeDiscount));
    const discountAmount =
      promo.discount_type === "percentage"
        ? Math.round(((sub * value) / 100) * 100) / 100
        : Math.min(sub, Math.round(value * 100) / 100);

    return {
      ok: true,
      code: promo.code,
      description: promo.description,
      discountType: promo.discount_type as "percentage" | "fixed",
      discountValue: value,
      discountAmount,
    };
  } catch {
    return { ok: false, error: "Could not validate the code right now." };
  }
}

/**
 * Saves a booking-in-progress so the reminder job can follow up if the
 * customer never completes the reservation. Best-effort — never throws.
 */
export async function saveBookingDraft(input: {
  email: string;
  firstName: string;
  vehicleId: string;
  pickupAt: string;
  returnAt: string;
}): Promise<{ ok: boolean }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  try {
    const admin = createAdminClient();
    // Keep a single open draft per email + vehicle.
    await admin
      .from("booking_drafts")
      .delete()
      .eq("email", email)
      .eq("vehicle_id", input.vehicleId)
      .eq("status", "open");
    await admin.from("booking_drafts").insert({
      email,
      first_name: input.firstName?.trim() || null,
      vehicle_id: input.vehicleId,
      pickup_at: input.pickupAt || null,
      return_at: input.returnAt || null,
      status: "open",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
