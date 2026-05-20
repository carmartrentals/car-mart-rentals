import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Revenue, utilization and financial analytics."
      />
      <ModulePlaceholder
        phase="Phase 3"
        features={[
          "Revenue by date and by vehicle",
          "Fleet utilization rates",
          "Reservations by source",
          "Outstanding balances and deposit holds",
          "Maintenance cost by vehicle",
          "CSV export for all reports",
        ]}
      />
    </>
  );
}
