import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/admin/customer-form";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>
      <PageHeader
        title="Add Customer"
        subtitle="Create a new customer profile."
      />
      <CustomerForm action={createCustomer} />
    </>
  );
}
