import { createAdminClient } from "@/lib/supabase/admin";
import type { PromoCode } from "@/lib/types/database";

/**
 * Promo codes that are currently usable: active, within their valid window
 * and not exhausted. Returns [] on any failure.
 */
export async function getActivePromoCodes(): Promise<PromoCode[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("promo_codes")
      .select("*")
      .eq("is_active", true)
      .order("discount_value", { ascending: false });
    const now = Date.now();
    return ((data as PromoCode[]) ?? []).filter((p) => {
      if (p.valid_from && new Date(p.valid_from).getTime() > now) return false;
      if (p.valid_until && new Date(p.valid_until).getTime() < now) return false;
      if (p.max_uses != null && p.times_used >= p.max_uses) return false;
      return true;
    });
  } catch {
    return [];
  }
}
