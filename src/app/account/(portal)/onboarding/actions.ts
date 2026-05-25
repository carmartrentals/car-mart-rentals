"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/account";
import type { ActionState } from "@/lib/form";

/**
 * Save the basic profile fields collected during onboarding. Photo upload
 * happens separately via uploadMyDocument(). All typed fields are optional —
 * the only hard requirement to complete onboarding is the DL photo upload.
 */
export async function saveOnboardingProfile(input: {
  phone?: string;
  date_of_birth?: string;
  dl_number?: string;
  dl_state?: string;
  dl_expiration?: string;
}): Promise<ActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in to continue." };

  const admin = createAdminClient();
  const update: Record<string, string | null> = {};

  if (input.phone !== undefined) {
    const v = input.phone.trim();
    update.phone = v || null;
  }
  if (input.date_of_birth !== undefined) {
    const v = input.date_of_birth.trim();
    update.date_of_birth = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }
  if (input.dl_number !== undefined) {
    const v = input.dl_number.trim();
    update.dl_number = v || null;
  }
  if (input.dl_state !== undefined) {
    const v = input.dl_state.trim().toUpperCase();
    update.dl_state = v || null;
  }
  if (input.dl_expiration !== undefined) {
    const v = input.dl_expiration.trim();
    update.dl_expiration = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await admin
    .from("customers")
    .update(update)
    .eq("id", customer.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/account");
  revalidatePath("/account/onboarding");
  return { ok: true };
}
