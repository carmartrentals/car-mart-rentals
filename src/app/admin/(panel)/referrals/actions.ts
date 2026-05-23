"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { notifyCustomer } from "@/lib/notifications";
import { getReferralProgram } from "@/lib/referral";
import type { ActionState } from "@/lib/form";

/** Save the referral-program settings (admin form). */
export async function saveReferralSettings(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can change program settings." };
  }
  const enabled = form.get("enabled") === "on";
  const amount = Number(form.get("reward_amount") ?? 0);
  const label = String(form.get("reward_label") ?? "").trim();
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Reward amount must be a positive number." };
  }
  if (!label) {
    return { ok: false, error: "Enter the reward text shown to customers." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert(
      {
        key: "referral_program",
        value: { enabled, reward_amount: amount, reward_label: label },
      },
      { onConflict: "key" },
    );
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "referral.settings_updated",
    description: `Referral program ${enabled ? "enabled" : "disabled"} · ${label}`,
  });
  revalidatePath("/admin/referrals");
  return { ok: true };
}

/**
 * Mark a referral as completed and email the referrer a reward notice. The
 * actual credit is applied manually (e.g. through a promo code or invoice
 * adjustment) — this records the status and notifies the customer.
 */
export async function approveReferral(
  referralId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to credit referrals." };
  }

  const admin = createAdminClient();
  const { data: refRow } = await admin
    .from("referrals")
    .select("id, status, referrer_id, referred_customer_id")
    .eq("id", referralId)
    .maybeSingle();
  const r = refRow as {
    id: string;
    status: string;
    referrer_id: string | null;
    referred_customer_id: string | null;
  } | null;
  if (!r) return { ok: false, error: "Referral not found." };
  if (r.status === "completed") {
    return { ok: false, error: "This referral is already credited." };
  }
  // Load the referrer + referred customer details for the reward email.
  const referrer = r.referrer_id
    ? (
        await admin
          .from("customers")
          .select("first_name, email")
          .eq("id", r.referrer_id)
          .maybeSingle()
      ).data as { first_name: string; email: string } | null
    : null;
  const referred = r.referred_customer_id
    ? (
        await admin
          .from("customers")
          .select("first_name, last_name")
          .eq("id", r.referred_customer_id)
          .maybeSingle()
      ).data as { first_name: string; last_name: string } | null
    : null;

  const { error } = await admin
    .from("referrals")
    .update({ status: "completed" })
    .eq("id", referralId);
  if (error) return { ok: false, error: error.message };

  const program = await getReferralProgram();
  const friendName = referred
    ? `${referred.first_name} ${referred.last_name}`.trim()
    : "your friend";

  if (referrer?.email) {
    await notifyCustomer({
      type: "referral_credited",
      to: referrer.email,
      subject: `🎉 You earned ${program.reward_label}!`,
      heading: "Your Referral Reward is Ready",
      intro: `Hi ${referrer.first_name}, ${friendName} completed their first rental — and we've credited you ${program.reward_label} on your next reservation. Thank you for sharing Car Mart Rentals!`,
      rows: [
        { label: "Reward", value: program.reward_label },
        { label: "Referred friend", value: friendName },
      ],
      cta: { label: "Book Again", path: "/vehicles" },
    });
  }

  await logActivity({
    userId: user.id,
    action: "referral.credited",
    entityType: "customer",
    description: `Credited referral reward · ${program.reward_label}`,
  });
  revalidatePath("/admin/referrals");
  return { ok: true };
}

/** Mark a referral as declined (e.g. fraud / cancelled rental). */
export async function declineReferral(
  referralId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to manage referrals." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("referrals")
    .update({ status: "declined" })
    .eq("id", referralId);
  if (error) return { ok: false, error: error.message };
  await logActivity({
    userId: user.id,
    action: "referral.declined",
    entityType: "customer",
  });
  revalidatePath("/admin/referrals");
  return { ok: true };
}
