import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function DamagesPage() {
  return (
    <>
      <PageHeader
        title="Damage Management"
        subtitle="Vehicle damage history, photos and repair tracking."
      />
      <ModulePlaceholder
        phase="Phase 2"
        features={[
          "Damage records with location and severity",
          "Before / after photo documentation",
          "Link damage to a reservation and inspection",
          "Repair status and cost estimates",
          "Charge-to-customer tracking",
        ]}
      />
    </>
  );
}
