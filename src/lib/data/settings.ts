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
