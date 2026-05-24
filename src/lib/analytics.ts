/**
 * Thin wrapper around GA4's gtag for tracking conversion events.
 * Safe to call even when GA4 isn't loaded (local dev, env var unset) —
 * the call is silently dropped.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type ConversionEvent =
  | "reserve_now_click"
  | "phone_click"
  | "booking_started"
  | "booking_completed"
  | "contact_form_submitted"
  | "insurance_intake_submitted"
  | "chat_opened"
  | "vehicle_card_click"
  | "promo_code_copied";

/**
 * Send a custom event to GA4. Use the typed ConversionEvent for the high-value
 * actions; pass any string for ad-hoc events.
 */
export function trackEvent(
  name: ConversionEvent | string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  // Drop undefined values — GA4 prefers them omitted.
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  window.gtag("event", name, clean);
}
