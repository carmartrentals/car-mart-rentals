import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { PromoManager } from "@/components/admin/promo-manager";
import { Alert } from "@/components/ui/misc";
import type { PromoCode } from "@/lib/types/database";

export default async function PromoCodesPage() {
  let codes: PromoCode[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    codes = (data as PromoCode[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Promo Codes"
        subtitle="Discount codes customers can apply to reservations."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load promo codes. Run migration 0006 and check Supabase.
          </Alert>
        </div>
      )}

      <PromoManager codes={codes} />
    </>
  );
}
