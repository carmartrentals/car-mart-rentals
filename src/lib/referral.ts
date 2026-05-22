import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** What a successful referral earns — shown to customers. */
export const REFERRAL_REWARD_TEXT = "$25 off";

/** Generate a short, easy-to-read referral code (no ambiguous characters). */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Get a customer's referral code, creating and saving one if missing. */
export async function getOrCreateReferralCode(
  admin: Admin,
  customerId: string,
): Promise<string> {
  const { data } = await admin
    .from("customers")
    .select("referral_code")
    .eq("id", customerId)
    .maybeSingle();
  if (data?.referral_code) return data.referral_code as string;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const { error } = await admin
      .from("customers")
      .update({ referral_code: code })
      .eq("id", customerId);
    if (!error) return code;
  }
  return generateReferralCode();
}
