import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ClaimManager } from "@/components/admin/claim-manager";
import { Alert } from "@/components/ui/misc";
import type { InsuranceClaim, Customer } from "@/lib/types/database";

type Row = InsuranceClaim & {
  customer: { first_name: string; last_name: string } | null;
};

export default async function ClaimsPage() {
  let claims: Row[] = [];
  let customers: { id: string; label: string }[] = [];
  let reservations: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const [claimRes, custRes, resvRes] = await Promise.all([
      admin
        .from("insurance_claims")
        .select("*, customer:customers(first_name,last_name)")
        .order("created_at", { ascending: false }),
      admin
        .from("customers")
        .select("id,first_name,last_name")
        .order("last_name"),
      admin
        .from("reservations")
        .select(
          "id, reservation_number, customer:customers(first_name,last_name)",
        )
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    claims = (claimRes.data as unknown as Row[]) ?? [];
    customers = (
      (custRes.data as Pick<Customer, "id" | "first_name" | "last_name">[]) ?? []
    ).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}` }));
    reservations = (
      (resvRes.data as unknown as {
        id: string;
        reservation_number: string;
        customer: { first_name: string; last_name: string } | null;
      }[]) ?? []
    ).map((r) => ({
      id: r.id,
      label: r.customer
        ? `${r.reservation_number} — ${r.customer.first_name} ${r.customer.last_name}`
        : r.reservation_number,
    }));
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Insurance Claims"
        subtitle="Track claim-based and body-shop replacement rentals."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load claims. Run migration 0008 and check Supabase.
          </Alert>
        </div>
      )}

      <ClaimManager
        claims={claims}
        customers={customers}
        reservations={reservations}
      />
    </>
  );
}
