import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payments & Deposits"
        subtitle="Stripe payments, security deposit holds and refunds."
      />
      <ModulePlaceholder
        phase="Phase 2"
        features={[
          "Charge rental payments via Stripe",
          "Authorize security deposits without capture",
          "Capture or refund deposits at check-in",
          "Payment logs with Stripe intent IDs",
          "Failed payment handling and retries",
        ]}
      />
    </>
  );
}
