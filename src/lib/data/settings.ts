import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY } from "@/lib/constants";

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

export interface CompanyProfile {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  phoneHref: string;
  website: string;
  address: string;
  logoUrl: string;
  tagline: string;
}

/**
 * Effective company profile — saved Settings values, with the built-in
 * constants as fallback. Use this everywhere instead of the COMPANY constant
 * so a change in Settings propagates site-wide (website, PDFs, emails).
 */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  const v = await getSetting<Record<string, unknown>>("company_profile", {});
  const phone = String(v.phone || COMPANY.phone);
  const digits = phone.replace(/\D/g, "");
  return {
    name: String(v.name || COMPANY.name),
    legalName: String(v.legal_name || ""),
    email: String(v.email || COMPANY.email),
    phone,
    phoneHref: `tel:+${digits.length === 10 ? `1${digits}` : digits}`,
    website: String(v.website || ""),
    address: String(v.address || COMPANY.address),
    logoUrl: String(v.logo_url || ""),
    tagline: COMPANY.tagline,
  };
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

export interface CancellationPolicy {
  /** Free-cancellation window — hours before pickup. */
  window_hours: number;
  /** Late-cancel fee as a percentage of the rental total (informational). */
  late_fee_percent: number;
}

/**
 * Cancellation policy — controls the "free cancellation up to X hours"
 * messaging on the booking form, vehicle widgets, and the late-cancel
 * warning in the customer portal. The fee isn't auto-charged yet — staff
 * decide case-by-case from the admin panel — but the number shown to the
 * customer comes from here so the whole site stays in sync.
 */
export async function getCancellationPolicy(): Promise<CancellationPolicy> {
  const v = await getSetting<Record<string, unknown>>(
    "cancellation_policy",
    {},
  );
  return {
    window_hours: Number(v.window_hours ?? 48) || 48,
    late_fee_percent: Number(v.late_fee_percent ?? 25) || 25,
  };
}

// ============================================================================
// Business hours
// ============================================================================
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export interface DayHours {
  /** Open time in HH:mm 24h. Empty = closed. */
  open: string;
  /** Close time in HH:mm 24h. */
  close: string;
}
export type BusinessHours = Record<DayKey, DayHours>;

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: "08:00", close: "19:00" },
  tue: { open: "08:00", close: "19:00" },
  wed: { open: "08:00", close: "19:00" },
  thu: { open: "08:00", close: "19:00" },
  fri: { open: "08:00", close: "19:00" },
  sat: { open: "09:00", close: "17:00" },
  sun: { open: "", close: "" },
};

export async function getBusinessHours(): Promise<BusinessHours> {
  const v = await getSetting<Partial<BusinessHours>>("business_hours", {});
  const out: BusinessHours = { ...DEFAULT_HOURS };
  (Object.keys(DEFAULT_HOURS) as DayKey[]).forEach((d) => {
    const day = v[d];
    if (day && typeof day === "object") {
      out[d] = {
        open: String(day.open ?? ""),
        close: String(day.close ?? ""),
      };
    }
  });
  return out;
}

/** Human-readable summary like "Mon–Fri 8 AM–7 PM · Sat 9 AM–5 PM · Closed Sun". */
export function formatBusinessHours(hrs: BusinessHours): string {
  const fmt = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  const dayName: Record<DayKey, string> = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
    fri: "Fri", sat: "Sat", sun: "Sun",
  };
  const parts: string[] = [];
  (Object.keys(hrs) as DayKey[]).forEach((d) => {
    const day = hrs[d];
    if (!day.open || !day.close) parts.push(`${dayName[d]} closed`);
    else parts.push(`${dayName[d]} ${fmt(day.open)}–${fmt(day.close)}`);
  });
  return parts.join(" · ");
}

// ============================================================================
// Driver requirements (extends booking_rules.min_driver_age)
// ============================================================================
export interface DriverRequirements {
  /** Minimum years the driver must have held a license. */
  min_years_licensed: number;
  /** Accept non-US (international) licenses? */
  accept_international: boolean;
  /** Accept learner's permits? Almost always false. */
  accept_permit: boolean;
  /** Extra $/day surcharge for drivers under the young-driver age. */
  young_driver_surcharge: number;
  /** Age below which the surcharge applies. */
  young_driver_age_threshold: number;
}

export async function getDriverRequirements(): Promise<DriverRequirements> {
  const v = await getSetting<Record<string, unknown>>(
    "driver_requirements",
    {},
  );
  return {
    min_years_licensed: Number(v.min_years_licensed ?? 1) || 0,
    accept_international: Boolean(v.accept_international ?? true),
    accept_permit: Boolean(v.accept_permit ?? false),
    young_driver_surcharge: Number(v.young_driver_surcharge ?? 0) || 0,
    young_driver_age_threshold: Number(v.young_driver_age_threshold ?? 25) || 25,
  };
}

// ============================================================================
// Late return policy
// ============================================================================
export interface LateReturnPolicy {
  /** Grace period in minutes — no fee inside this window. */
  grace_minutes: number;
  /** Per-hour overtime rate ($). */
  hourly_rate: number;
  /** After this many late hours, charge a full extra day instead. */
  full_day_after_hours: number;
}

export async function getLateReturnPolicy(): Promise<LateReturnPolicy> {
  const v = await getSetting<Record<string, unknown>>("late_return_policy", {});
  return {
    grace_minutes: Number(v.grace_minutes ?? 30) || 0,
    hourly_rate: Number(v.hourly_rate ?? 25) || 0,
    full_day_after_hours: Number(v.full_day_after_hours ?? 4) || 4,
  };
}

// ============================================================================
// Fuel policy
// ============================================================================
export interface FuelPolicy {
  /** Flat fee if customer returns the car not full. */
  refuel_service_fee: number;
  /** Per-gallon convenience markup added to actual gas price. */
  per_gallon_markup: number;
}

export async function getFuelPolicy(): Promise<FuelPolicy> {
  const v = await getSetting<Record<string, unknown>>("fuel_policy", {});
  return {
    refuel_service_fee: Number(v.refuel_service_fee ?? 50) || 0,
    per_gallon_markup: Number(v.per_gallon_markup ?? 2) || 0,
  };
}

// ============================================================================
// Pickup & delivery options
// ============================================================================
export interface DeliveryOptions {
  in_house_enabled: boolean;
  local_enabled: boolean;
  /** Free up to this many miles from the in-house location. */
  local_free_miles: number;
  /** $/mile beyond the free radius. */
  local_per_mile_fee: number;
  airport_enabled: boolean;
  airport_flat_fee: number;
}

export async function getDeliveryOptions(): Promise<DeliveryOptions> {
  const v = await getSetting<Record<string, unknown>>("delivery_options", {});
  return {
    in_house_enabled: Boolean(v.in_house_enabled ?? true),
    local_enabled: Boolean(v.local_enabled ?? true),
    local_free_miles: Number(v.local_free_miles ?? 10) || 0,
    local_per_mile_fee: Number(v.local_per_mile_fee ?? 3) || 0,
    airport_enabled: Boolean(v.airport_enabled ?? true),
    airport_flat_fee: Number(v.airport_flat_fee ?? 75) || 0,
  };
}

// ============================================================================
// Auto-email preferences (customer-facing automated sends)
// ============================================================================
export interface AutoEmailPreferences {
  /** Send pre-check-in invite this many hours before pickup. 0 = off. */
  precheckin_hours_before: number;
  /** Send thank-you + review request this many hours after return. 0 = off. */
  thanks_hours_after_return: number;
  /** Send unpaid-balance reminder every N days. 0 = off. */
  unpaid_reminder_days: number;
  /** Send insurance-doc-expiring nudge to customers when their doc is within N days. 0 = off. */
  insurance_expiry_nudge_days: number;
}

export async function getAutoEmailPreferences(): Promise<AutoEmailPreferences> {
  const v = await getSetting<Record<string, unknown>>("auto_email_prefs", {});
  return {
    precheckin_hours_before: Number(v.precheckin_hours_before ?? 24) || 0,
    thanks_hours_after_return: Number(v.thanks_hours_after_return ?? 4) || 0,
    unpaid_reminder_days: Number(v.unpaid_reminder_days ?? 3) || 0,
    insurance_expiry_nudge_days: Number(v.insurance_expiry_nudge_days ?? 14) || 0,
  };
}

// ============================================================================
// Owner notification triggers (which events email YOU the operator)
// ============================================================================
export interface OwnerNotifications {
  on_new_booking: boolean;
  on_cancellation: boolean;
  on_high_risk_booking: boolean;
  on_damage_detected: boolean;
  on_failed_payment: boolean;
  on_late_return: boolean;
  on_ai_call_completed: boolean;
}

export async function getOwnerNotifications(): Promise<OwnerNotifications> {
  const v = await getSetting<Record<string, unknown>>("owner_notifications", {});
  return {
    on_new_booking: Boolean(v.on_new_booking ?? true),
    on_cancellation: Boolean(v.on_cancellation ?? true),
    on_high_risk_booking: Boolean(v.on_high_risk_booking ?? true),
    on_damage_detected: Boolean(v.on_damage_detected ?? true),
    on_failed_payment: Boolean(v.on_failed_payment ?? true),
    on_late_return: Boolean(v.on_late_return ?? true),
    on_ai_call_completed: Boolean(v.on_ai_call_completed ?? false),
  };
}

// ============================================================================
// Verification gate level
// ============================================================================
export interface VerificationGates {
  /** "ai" = AI photo check only / "ai_dmv" = require manual DMV recorded / "stripe" = require Stripe Identity */
  license_level: "ai" | "ai_dmv" | "stripe";
  /** "off" = don't require insurance / "required" = upload required / "ai_pass" = AI score must pass */
  insurance_level: "off" | "required" | "ai_pass";
  /** Minimum AI insurance score (0-100) when insurance_level = ai_pass. */
  insurance_min_score: number;
  /** When true, the system blocks check-out if either gate isn't met. */
  block_checkout_on_fail: boolean;
}

export async function getVerificationGates(): Promise<VerificationGates> {
  const v = await getSetting<Record<string, unknown>>("verification_gates", {});
  const lvl = String(v.license_level ?? "ai");
  const ins = String(v.insurance_level ?? "required");
  return {
    license_level: (["ai", "ai_dmv", "stripe"].includes(lvl) ? lvl : "ai") as
      | "ai" | "ai_dmv" | "stripe",
    insurance_level: (["off", "required", "ai_pass"].includes(ins) ? ins : "required") as
      | "off" | "required" | "ai_pass",
    insurance_min_score: Number(v.insurance_min_score ?? 70) || 0,
    block_checkout_on_fail: Boolean(v.block_checkout_on_fail ?? true),
  };
}

// ============================================================================
// Social media links (rendered in site footer)
// ============================================================================
export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  yelp: string;
  google_reviews: string;
  twitter: string;
  youtube: string;
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const v = await getSetting<Record<string, unknown>>("social_links", {});
  return {
    instagram: String(v.instagram ?? ""),
    facebook: String(v.facebook ?? ""),
    tiktok: String(v.tiktok ?? ""),
    yelp: String(v.yelp ?? ""),
    google_reviews: String(v.google_reviews ?? ""),
    twitter: String(v.twitter ?? ""),
    youtube: String(v.youtube ?? ""),
  };
}

// ============================================================================
// Display timezone
// ============================================================================
export async function getDisplayTimezone(): Promise<string> {
  const v = await getSetting<Record<string, unknown>>("display", {});
  // Default to Los Angeles since the business is in Van Nuys, CA. Operators
  // outside CA can override.
  return String(v.timezone ?? "America/Los_Angeles");
}

// ============================================================================
// Toll passthrough markup
// ============================================================================
export interface TollPassthrough {
  /** Flat $ added to each toll event passed through to the customer. */
  flat_markup: number;
  /** % markup on top of the actual toll amount. */
  percent_markup: number;
}

export async function getTollPassthrough(): Promise<TollPassthrough> {
  const v = await getSetting<Record<string, unknown>>("toll_passthrough", {});
  return {
    flat_markup: Number(v.flat_markup ?? 5) || 0,
    percent_markup: Number(v.percent_markup ?? 0) || 0,
  };
}

export interface AiVoiceSettings {
  /** "polly" = legacy Twilio TTS + Gather + chat. "realtime" = OpenAI Realtime via bridge. */
  mode: "polly" | "realtime";
  /** Polly voice name when mode = polly. e.g. Polly.Joanna-Neural, Polly.Matthew-Neural */
  voice: string;
  /** OpenAI Realtime voice when mode = realtime. e.g. coral, ash, nova, shimmer, verse */
  realtime_voice: string;
}

/**
 * AI receptionist voice configuration. Lets the operator A/B-test voices
 * and switch between the legacy Polly stack and the OpenAI Realtime stack
 * without redeploying code.
 */
export async function getAiVoiceSettings(): Promise<AiVoiceSettings> {
  const v = await getSetting<Record<string, unknown>>("ai_voice", {});
  const mode = v.mode === "realtime" ? "realtime" : "polly";
  return {
    mode,
    voice: String(v.voice || "Polly.Joanna-Neural"),
    realtime_voice: String(v.realtime_voice || "coral"),
  };
}
