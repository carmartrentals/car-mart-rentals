import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { JsonLd } from "@/components/seo/json-ld";
import { getCompanyProfile } from "@/lib/data/settings";
import { aiConfigured } from "@/lib/ai";
import { SITE_URL } from "@/lib/constants";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompanyProfile();
  const businessLd = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: company.name,
    description:
      "Premium luxury car rentals and insurance-replacement vehicles in the Los Angeles area.",
    url: SITE_URL,
    telephone: company.phone,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressCountry: "US",
    },
    priceRange: "$$$",
    ...(company.logoUrl ? { image: company.logoUrl } : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-950 text-slate-300">
      <JsonLd data={businessLd} />
      <Navbar phone={company.phone} phoneHref={company.phoneHref} />
      <main className="flex-1">{children}</main>
      <Footer />
      {aiConfigured() && <ChatWidget companyName={company.name} />}
    </div>
  );
}
