import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { getCompanyProfile } from "@/lib/data/settings";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompanyProfile();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar phone={company.phone} phoneHref={company.phoneHref} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
