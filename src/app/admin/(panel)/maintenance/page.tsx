import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function MaintenancePage() {
  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Service scheduling, costs and vehicle downtime tracking."
      />
      <ModulePlaceholder
        phase="Phase 2"
        features={[
          "Service schedule by mileage and date",
          "Oil changes, tires, brakes, registration & insurance",
          "Cost tracking and vendor records",
          "Receipt attachments",
          "Vehicle downtime and maintenance status",
        ]}
      />
    </>
  );
}
