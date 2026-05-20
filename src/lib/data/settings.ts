import { createAdminClient } from "@/lib/supabase/admin";

/** Reads a single setting value by key. Returns `fallback` on any failure. */
export async function getSetting<T = Record<string, unknown>>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return ((data?.value as T) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Effective sales tax rate as a percentage (e.g. 9.5). */
export async function getTaxRate(): Promise<number> {
  const tax = await getSetting<{ rate: number; enabled: boolean }>("tax", {
    rate: 0,
    enabled: false,
  });
  return tax.enabled ? Number(tax.rate) || 0 : 0;
}

/** Booking rules used to validate reservations. */
export async function getBookingRules() {
  return getSetting("booking_rules", {
    min_rental_days: 1,
    max_rental_days: 90,
    min_driver_age: 21,
    buffer_hours: 2,
    advance_booking_hours: 2,
    require_deposit: true,
  });
}
