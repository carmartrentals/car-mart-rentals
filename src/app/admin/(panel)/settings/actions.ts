"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { AddonPriceType, FeeType } from "@/lib/types/database";

async function requireSettingsAccess() {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) return null;
  return user;
}

// --- General settings -------------------------------------------------------
export async function saveGeneralSettings(input: {
  company: {
    name: string; legal_name: string; email: string;
    phone: string; website: string; address: string; logo_url: string;
  };
  tax: { rate: number; label: string; enabled: boolean };
  bookingRules: {
    min_rental_days: number; max_rental_days: number;
    min_driver_age: number; buffer_hours: number;
  };
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user) return { ok: false, error: "Only a Super Admin can change settings." };

  const admin = createAdminClient();
  const rows: { key: string; value: Record<string, unknown>; category: string }[] = [
    { key: "company_profile", value: { ...input.company }, category: "general" },
    { key: "tax", value: { ...input.tax }, category: "finance" },
    { key: "booking_rules", value: { ...input.bookingRules }, category: "booking" },
  ];
  for (const row of rows) {
    const { error } = await admin
      .from("settings")
      .upsert(row as never, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
  }

  await logActivity({
    userId: user.id,
    action: "settings.updated",
    entityType: "settings",
    description: "Updated company, tax and booking settings",
  });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Generic settings saver (used by the new operations cards) -------------
// Same pattern as the individual save functions but takes any key+value and
// is gated by Super Admin. Keeps boilerplate down for the 11 new cards.
async function upsertSetting(args: {
  user: { id: string };
  key: string;
  value: Record<string, unknown>;
  category: string;
  activityDescription: string;
}): Promise<ActionState> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert(
      { key: args.key, value: args.value, category: args.category } as never,
      { onConflict: "key" },
    );
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: args.user.id,
    action: `settings.${args.key}_updated`,
    entityType: "settings",
    description: args.activityDescription,
  });
  revalidatePath("/admin/settings");
  // Revalidate the whole tree so customer-facing copy that reads these
  // settings re-renders on the next request without waiting for the
  // route's static cache to expire.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBusinessHours(
  value: Record<string, { open: string; close: string }>,
): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "business_hours",
    value,
    category: "operations",
    activityDescription: "Updated business hours",
  });
}

export async function saveDriverRequirements(value: {
  min_years_licensed: number;
  accept_international: boolean;
  accept_permit: boolean;
  young_driver_surcharge: number;
  young_driver_age_threshold: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "driver_requirements",
    value: {
      min_years_licensed: Math.max(0, Math.round(value.min_years_licensed || 0)),
      accept_international: !!value.accept_international,
      accept_permit: !!value.accept_permit,
      young_driver_surcharge: Math.max(0, Number(value.young_driver_surcharge) || 0),
      young_driver_age_threshold: Math.max(
        16,
        Math.round(value.young_driver_age_threshold || 25),
      ),
    },
    category: "booking",
    activityDescription: `Min ${value.min_years_licensed}y licensed, intl=${value.accept_international}`,
  });
}

export async function saveLateReturnPolicy(value: {
  grace_minutes: number;
  hourly_rate: number;
  full_day_after_hours: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "late_return_policy",
    value: {
      grace_minutes: Math.max(0, Math.round(value.grace_minutes || 0)),
      hourly_rate: Math.max(0, Number(value.hourly_rate) || 0),
      full_day_after_hours: Math.max(0, Math.round(value.full_day_after_hours || 0)),
    },
    category: "operations",
    activityDescription: `Grace ${value.grace_minutes}min · $${value.hourly_rate}/hr`,
  });
}

export async function saveFuelPolicy(value: {
  refuel_service_fee: number;
  per_gallon_markup: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "fuel_policy",
    value: {
      refuel_service_fee: Math.max(0, Number(value.refuel_service_fee) || 0),
      per_gallon_markup: Math.max(0, Number(value.per_gallon_markup) || 0),
    },
    category: "operations",
    activityDescription: `Refuel $${value.refuel_service_fee} · markup $${value.per_gallon_markup}/gal`,
  });
}

export async function saveDeliveryOptions(value: {
  in_house_enabled: boolean;
  local_enabled: boolean;
  local_free_miles: number;
  local_per_mile_fee: number;
  airport_enabled: boolean;
  airport_flat_fee: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "delivery_options",
    value: {
      in_house_enabled: !!value.in_house_enabled,
      local_enabled: !!value.local_enabled,
      local_free_miles: Math.max(0, Math.round(value.local_free_miles || 0)),
      local_per_mile_fee: Math.max(0, Number(value.local_per_mile_fee) || 0),
      airport_enabled: !!value.airport_enabled,
      airport_flat_fee: Math.max(0, Number(value.airport_flat_fee) || 0),
    },
    category: "operations",
    activityDescription: `Delivery options updated`,
  });
}

export async function saveAutoEmailPreferences(value: {
  precheckin_hours_before: number;
  pickup_reminder_hours_before: number;
  missing_docs_reminder_hours_after_booking: number;
  return_reminder_hours_before: number;
  thanks_hours_after_return: number;
  unpaid_reminder_days: number;
  license_expiry_nudge_days: number;
  insurance_expiry_nudge_days: number;
  winback_months: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  const clamp = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));
  return upsertSetting({
    user,
    key: "auto_email_prefs",
    value: {
      precheckin_hours_before: clamp(value.precheckin_hours_before),
      pickup_reminder_hours_before: clamp(value.pickup_reminder_hours_before),
      missing_docs_reminder_hours_after_booking: clamp(
        value.missing_docs_reminder_hours_after_booking,
      ),
      return_reminder_hours_before: clamp(value.return_reminder_hours_before),
      thanks_hours_after_return: clamp(value.thanks_hours_after_return),
      unpaid_reminder_days: clamp(value.unpaid_reminder_days),
      license_expiry_nudge_days: clamp(value.license_expiry_nudge_days),
      insurance_expiry_nudge_days: clamp(value.insurance_expiry_nudge_days),
      winback_months: clamp(value.winback_months),
    },
    category: "notifications",
    activityDescription: `Auto-email preferences updated`,
  });
}

export async function saveOwnerNotifications(value: {
  on_new_booking: boolean;
  on_cancellation: boolean;
  on_high_risk_booking: boolean;
  on_damage_detected: boolean;
  on_failed_payment: boolean;
  on_late_return: boolean;
  on_ai_call_completed: boolean;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "owner_notifications",
    value: { ...value },
    category: "notifications",
    activityDescription: `Owner notification triggers updated`,
  });
}

export async function saveVerificationGates(value: {
  license_checks: { ai: boolean; dmv: boolean; stripe: boolean };
  insurance_level: "off" | "required" | "ai_pass";
  insurance_min_score: number;
  block_checkout_on_fail: boolean;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  const checks = {
    ai: !!value.license_checks?.ai,
    dmv: !!value.license_checks?.dmv,
    stripe: !!value.license_checks?.stripe,
  };
  if (!checks.ai && !checks.dmv && !checks.stripe) {
    return {
      ok: false,
      error: "Pick at least one driver license verification check.",
    };
  }
  const ticked = [
    checks.ai && "AI",
    checks.dmv && "DMV",
    checks.stripe && "Stripe",
  ]
    .filter(Boolean)
    .join("+");
  return upsertSetting({
    user,
    key: "verification_gates",
    value: {
      license_checks: checks,
      insurance_level: value.insurance_level,
      insurance_min_score: Math.max(0, Math.min(100, Math.round(value.insurance_min_score || 0))),
      block_checkout_on_fail: !!value.block_checkout_on_fail,
    },
    category: "operations",
    activityDescription: `Gates: license=${ticked} · insurance=${value.insurance_level}`,
  });
}

export async function saveSocialLinks(value: {
  instagram: string;
  facebook: string;
  tiktok: string;
  yelp: string;
  google_reviews: string;
  twitter: string;
  youtube: string;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  // Light validation — must look like a URL (or empty).
  const ok = (u: string) => !u || /^https?:\/\//i.test(u);
  if (!Object.values(value).every(ok))
    return { ok: false, error: "Social links must start with http:// or https://" };
  return upsertSetting({
    user,
    key: "social_links",
    value: { ...value },
    category: "display",
    activityDescription: `Social media links updated`,
  });
}

export async function saveDisplaySettings(value: {
  timezone: string;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "display",
    value: { timezone: value.timezone },
    category: "display",
    activityDescription: `Display timezone: ${value.timezone}`,
  });
}

export async function saveTollPassthrough(value: {
  flat_markup: number;
  percent_markup: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  return upsertSetting({
    user,
    key: "toll_passthrough",
    value: {
      flat_markup: Math.max(0, Number(value.flat_markup) || 0),
      percent_markup: Math.max(0, Math.min(100, Number(value.percent_markup) || 0)),
    },
    category: "operations",
    activityDescription: `Toll markup $${value.flat_markup} + ${value.percent_markup}%`,
  });
}

// --- Birthday campaign ------------------------------------------------------
export async function saveBirthdayCampaign(value: {
  enabled: boolean;
  lead_unit: "days" | "weeks" | "months";
  lead_amount: number;
  discount_percent: number;
  promo_code: string;
  subject_template: string;
  intro_template: string;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change settings." };
  const lead = ["days", "weeks", "months"].includes(value.lead_unit)
    ? value.lead_unit
    : "days";
  return upsertSetting({
    user,
    key: "birthday_campaign",
    value: {
      enabled: !!value.enabled,
      lead_unit: lead,
      lead_amount: Math.max(0, Math.round(Number(value.lead_amount) || 1)),
      discount_percent: Math.max(
        0,
        Math.min(100, Math.round(Number(value.discount_percent) || 15)),
      ),
      promo_code: String(value.promo_code || "BIRTHDAY15")
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 24),
      subject_template: String(value.subject_template || "").slice(0, 200),
      intro_template: String(value.intro_template || "").slice(0, 1500),
    },
    category: "marketing",
    activityDescription: `Birthday campaign: ${value.enabled ? "on" : "off"} · ${value.lead_amount} ${lead} before · ${value.discount_percent}%`,
  });
}

// --- Cancellation policy ----------------------------------------------------
export async function saveCancellationPolicy(input: {
  window_hours: number;
  late_fee_percent: number;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return {
      ok: false,
      error: "Only a Super Admin can change the cancellation policy.",
    };

  const windowHours = Math.max(0, Math.round(Number(input.window_hours) || 0));
  const lateFeePercent = Math.max(
    0,
    Math.min(100, Number(input.late_fee_percent) || 0),
  );

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert(
      {
        key: "cancellation_policy",
        value: {
          window_hours: windowHours,
          late_fee_percent: lateFeePercent,
        },
        category: "booking",
      } as never,
      { onConflict: "key" },
    );
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "settings.cancellation_policy_updated",
    entityType: "settings",
    description: `Free window ${windowHours}h, late fee ${lateFeePercent}%`,
  });
  revalidatePath("/admin/settings");
  // Re-render any page that surfaces the cancellation copy so it picks up
  // the new numbers without a redeploy.
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- AI receptionist voice --------------------------------------------------
export async function saveAiVoiceSettings(input: {
  mode: "polly" | "realtime";
  voice: string;
  realtime_voice: string;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user)
    return { ok: false, error: "Only a Super Admin can change voice settings." };

  const mode = input.mode === "realtime" ? "realtime" : "polly";
  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert(
      {
        key: "ai_voice",
        value: {
          mode,
          voice: input.voice || "Polly.Joanna-Neural",
          realtime_voice: input.realtime_voice || "coral",
        },
        category: "ai",
      } as never,
      { onConflict: "key" },
    );
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "settings.ai_voice_updated",
    entityType: "settings",
    description: `Voice mode: ${mode}, Polly: ${input.voice}, Realtime: ${input.realtime_voice}`,
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Add-ons ----------------------------------------------------------------
export async function saveAddOn(input: {
  id?: string;
  name: string;
  description: string;
  price: number;
  price_type: AddonPriceType;
  is_active: boolean;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user) return { ok: false, error: "Only a Super Admin can manage add-ons." };
  if (!input.name.trim()) return { ok: false, error: "Enter an add-on name." };

  const admin = createAdminClient();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    price_type: input.price_type,
    is_active: input.is_active,
  };
  const { error } = input.id
    ? await admin.from("add_ons").update(payload).eq("id", input.id)
    : await admin.from("add_ons").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Fees -------------------------------------------------------------------
export async function saveFee(input: {
  id?: string;
  name: string;
  description: string;
  amount: number;
  fee_type: FeeType;
  is_taxable: boolean;
  is_active: boolean;
}): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user) return { ok: false, error: "Only a Super Admin can manage fees." };
  if (!input.name.trim()) return { ok: false, error: "Enter a fee name." };

  const admin = createAdminClient();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    amount: input.amount,
    fee_type: input.fee_type,
    is_taxable: input.is_taxable,
    is_active: input.is_active,
  };
  const { error } = input.id
    ? await admin.from("fees").update(payload).eq("id", input.id)
    : await admin.from("fees").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- Toggle active ----------------------------------------------------------
export async function toggleCatalogItem(
  table: "add_ons" | "fees",
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const user = await requireSettingsAccess();
  if (!user) return { ok: false, error: "Only a Super Admin can manage the catalog." };

  const admin = createAdminClient();
  const { error } = await admin
    .from(table)
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}
