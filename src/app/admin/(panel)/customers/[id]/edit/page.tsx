import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/admin/customer-form";
import { updateCustomer } from "../../actions";
import type { Customer } from "@/lib/types/database";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let customer: Customer | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    customer = data as Customer | null;
  } catch {
    notFound();
  }
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <>
      <Link
        href={`/admin/customers/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customer
      </Link>
      <PageHeader
        title={`Edit ${customer.first_name} ${customer.last_name}`}
        subtitle="Update customer profile and documents."
      />
      <CustomerForm action={action} customer={customer} />
    </>
  );
}
