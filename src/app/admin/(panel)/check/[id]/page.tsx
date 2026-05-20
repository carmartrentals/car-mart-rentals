import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default async function CheckWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Link
        href={`/admin/reservations/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservation
      </Link>
      <PageHeader
        title="Check-in / Check-out Workflow"
        subtitle="Inspection, photos, signatures and documents for this reservation."
      />
      <ModulePlaceholder
        phase="Phase 2"
        features={[
          "Step-by-step check-out and check-in wizard",
          "Odometer & fuel capture with photo evidence",
          "Damage marking linked to the inspection record",
          "E-signature pad for customer and staff",
          "Rental agreement and inspection report PDFs",
        ]}
      />
    </>
  );
}
