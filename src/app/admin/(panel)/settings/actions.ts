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
