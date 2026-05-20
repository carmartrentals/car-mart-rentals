import type { Metadata } from "next";
import { requireCustomer } from "@/lib/account";
import { AccountHeader } from "@/components/account/account-header";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await requireCustomer();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AccountHeader customerName={`${customer.first_name} ${customer.last_name}`} />
      <main className="flex-1">
        <div className="container-px py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
