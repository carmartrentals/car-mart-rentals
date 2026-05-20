import { PageHeader } from "@/components/admin/page-header";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function InvoicesPage() {
  return (
    <>
      <PageHeader
        title="Invoices & Documents"
        subtitle="Quotes, invoices, receipts and inspection reports."
      />
      <ModulePlaceholder
        phase="Phase 2"
        features={[
          "Generate quotes, invoices and payment receipts",
          "Rental agreement and inspection report PDFs",
          "Company-branded document templates",
          "Email documents directly to customers",
          "Document storage in Supabase Storage",
        ]}
      />
    </>
  );
}
