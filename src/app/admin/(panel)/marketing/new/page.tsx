import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { Alert } from "@/components/ui/misc";
import type { PromoCode } from "@/lib/types/database";

export default async function NewCampaignPage() {
  let promos: PromoCode[] = [];
  let eligibleCount = 0;
  let configError = false;

  try {
    const admin = createAdminClient();
    const [promoRes, customerCountRes] = await Promise.all([
      admin
        .from("promo_codes")
        .select("*")
        .eq("is_active", true)
        .order("code"),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .not("email", "is", null)
        .eq("marketing_opted_out", false)
        .eq("is_blacklisted", false),
    ]);
    promos = (promoRes.data as PromoCode[]) ?? [];
    eligibleCount = customerCountRes.count ?? 0;
  } catch {
    configError = true;
  }

  return (
    <>
      <Link
        href="/admin/marketing"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Marketing
      </Link>
      <PageHeader
        title="New Campaign"
        subtitle="Compose a branded promotional email and send it to every eligible customer."
      />

      {configError ? (
        <Alert tone="warning">
          Could not load promo codes. Run migration 0028 in Supabase.
        </Alert>
      ) : (
        <CampaignComposer promos={promos} eligibleCount={eligibleCount} />
      )}
    </>
  );
}
