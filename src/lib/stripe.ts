import Stripe from "stripe";

/**
 * Stripe client — SERVER ONLY.
 * Configure STRIPE_SECRET_KEY in the environment to enable payments.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.",
    );
  }
  cached = new Stripe(key);
  return cached;
}

/** True when Stripe credentials are present. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Dollars → integer cents. */
export const toCents = (amount: number): number => Math.round(amount * 100);

/** Integer cents → dollars. */
export const fromCents = (cents: number): number => Math.round(cents) / 100;
