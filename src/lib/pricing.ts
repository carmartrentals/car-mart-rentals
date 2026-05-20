// ============================================================================
// Car Mart Rentals — reservation pricing engine
// Shared by the public booking flow and the admin reservation form.
// ============================================================================

import { rentalDays, bestRate } from "@/lib/utils";
import type { RateType } from "@/lib/types/database";

export interface PricingVehicle {
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  weekend_rate: number | null;
  security_deposit: number;
}

export interface PricingAddOn {
  price: number;
  price_type: "per_day" | "per_rental";
}

export interface PricingInput {
  vehicle: PricingVehicle;
  pickupAt: string | Date;
  returnAt: string | Date;
  addOns?: PricingAddOn[];
  /** Flat fee charges (cleaning, delivery, manual fees). */
  feeCharges?: { amount: number }[];
  discountAmount?: number;
  /** Tax rate as a percentage, e.g. 9.5 */
  taxRatePercent?: number;
  /** Override the auto-selected rate type. */
  rateTypeOverride?: RateType;
  /** Override the per-day rate (admin manual pricing). */
  rateAmountOverride?: number;
}

export interface PricingResult {
  rentalDays: number;
  rateType: RateType;
  rateAmount: number;
  rentalSubtotal: number;
  addonsTotal: number;
  feesTotal: number;
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  depositAmount: number;
}

/**
 * Computes a full price breakdown for a reservation.
 * Tax is applied to the rental + add-ons + fees, after discount.
 */
export function computeReservationTotals(input: PricingInput): PricingResult {
  const days = rentalDays(input.pickupAt, input.returnAt);

  let rateType: RateType;
  let rateAmount: number;
  let rentalSubtotal: number;

  if (input.rateAmountOverride != null) {
    rateType = input.rateTypeOverride ?? "daily";
    rateAmount = input.rateAmountOverride;
    rentalSubtotal = rateAmount * days;
  } else {
    const best = bestRate(input.vehicle, days);
    rateType = best.rateType;
    rateAmount = best.perDay;
    rentalSubtotal = best.total;
  }

  const addonsTotal = (input.addOns ?? []).reduce(
    (sum, a) =>
      sum + (a.price_type === "per_day" ? a.price * days : a.price),
    0,
  );

  const feesTotal = (input.feeCharges ?? []).reduce(
    (sum, f) => sum + f.amount,
    0,
  );

  const discountAmount = Math.min(
    input.discountAmount ?? 0,
    rentalSubtotal + addonsTotal + feesTotal,
  );

  const taxableBase = Math.max(
    0,
    rentalSubtotal + addonsTotal + feesTotal - discountAmount,
  );

  const taxRate = (input.taxRatePercent ?? 0) / 100;
  const taxAmount = round2(taxableBase * taxRate);
  const subtotal = round2(rentalSubtotal + addonsTotal + feesTotal);
  const total = round2(taxableBase + taxAmount);

  return {
    rentalDays: days,
    rateType,
    rateAmount: round2(rateAmount),
    rentalSubtotal: round2(rentalSubtotal),
    addonsTotal: round2(addonsTotal),
    feesTotal: round2(feesTotal),
    discountAmount: round2(discountAmount),
    taxableBase: round2(taxableBase),
    taxAmount,
    subtotal,
    total,
    depositAmount: round2(input.vehicle.security_deposit),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
