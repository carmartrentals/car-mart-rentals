import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewManager } from "@/components/admin/review-manager";
import { Alert } from "@/components/ui/misc";
import type { Review } from "@/lib/types/database";

export default async function ReviewsPage() {
  let reviews: Review[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const [revRes, vehRes] = await Promise.all([
      admin.from("reviews").select("*").order("created_at", { ascending: false }),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    reviews = (revRes.data as Review[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Customer Reviews"
        subtitle="Manage reviews — published reviews appear on your website."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load reviews. Run migration 0008 and check Supabase.
          </Alert>
        </div>
      )}

      <ReviewManager reviews={reviews} vehicles={vehicles} />
    </>
  );
}
