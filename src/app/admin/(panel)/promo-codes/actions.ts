"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { DiscountType } from "@/lib/types/database";

export async function savePromoCode(input: {
  id?: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_rental_days: number;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can manage promo codes." };
  }
  if (!input.code.trim()) return { ok: false, error: "Enter a promo code." };

  const admin = createAdminClient();
  const payload = {
    code: input.code.trim().toUpperCase(),
    description: input.description.trim() || null,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    min_rental_days: input.min_rental_days || 1,
    max_uses: input.max_uses ? Number(input.max_uses) : null,
    valid_from: input.valid_from || null,
    valid_until: input.valid_until || null,
    is_active: input.is_active,
  };
  const { error } = input.id
    ? await admin.from("promo_codes").update(payload).eq("id", input.id)
    : await admin.from("promo_codes").insert(payload);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("duplicate")
        ? "That promo code already exists."
        : error.message,
    };
  }

  await logActivity({
    userId: user.id,
    action: input.id ? "promo_code.updated" : "promo_code.created",
    entityType: "promo_code",
  });
  revalidatePath("/admin/promo-codes");
  return { ok: true };
}

export async function togglePromoCode(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can manage promo codes." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/promo-codes");
  return { ok: true };
}

/**
 * Permanently delete a promo code. Refuses if the code has already been
 * used at least once on a real reservation — those rows reference the
 * code by name in their description, and deleting the master row would
 * make audit / refund flows confusing. Operator can deactivate instead.
 */
export async function deletePromoCode(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can manage promo codes." };
  }
  const admin = createAdminClient();

  // Fetch usage so we can refuse + give the operator a clear next step.
  const { data: existing } = await admin
    .from("promo_codes")
    .select("code, times_used")
    .eq("id", id)
    .maybeSingle();
  const row = existing as { code: string; times_used: number } | null;
  if (!row) {
    return { ok: false, error: "Promo code not found." };
  }
  if ((row.times_used ?? 0) > 0) {
    return {
      ok: false,
      error: `This code has been used ${row.times_used} time(s) on real bookings — deleting would orphan those records. Deactivate it instead.`,
    };
  }

  const { error } = await admin.from("promo_codes").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logActivity({
    userId: user.id,
    action: "promo_code.deleted",
    entityType: "promo_code",
    entityId: id,
    description: `Deleted promo code ${row.code}`,
  });
  revalidatePath("/admin/promo-codes");
  return { ok: true };
}
