import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
import { JsonLd } from "@/components/seo/json-ld";
import { getCompanyProfile } from "@/lib/data/settings";
import { aiConfigured } from "@/lib/ai";
import { SITE_URL } from "@/lib/constants";
import { SEO_LOCATIONS } from "@/lib/locations-seo";

// Geo coordinates for the Van Nuys HQ. Update if you ever move locations.
const HQ_GEO = { latitude: 34.1844, longitude: -118.4513 };
const HQ_LOCALITY = "Van Nuys";
const HQ_REGION = "CA";
const HQ_POSTAL = "91406";

// Public social profiles — wire these up in Settings and they'll appear in
// the Organization schema (powers the Knowledge Panel on brand searches).
const SAME_AS: string[] = [
  // "https://www.instagram.com/carmartrentals",
  // "https://www.facebook.com/carmartrentals",
  // "https://www.google.com/maps?cid=YOUR_GOOGLE_BUSINESS_ID",
];

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompanyProfile();

  // AutoRental (LocalBusiness subtype) — the primary local-SEO signal.
  const businessLd = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    "@id": `${SITE_URL}/#business`,
    name: company.name,
    legalName: company.legalName || company.name,
    description:
      "Premium luxury car rentals and insurance-replacement vehicles serving Van Nuys, the San Fernando Valley and Greater Los Angeles.",
    url: SITE_URL,
    telephone: company.phone,
    email: company.email,
    image: company.logoUrl || `${SITE_URL}/og-image.png`,
    logo: company.logoUrl || `${SITE_URL}/logo.png`,
    priceRange: "$$$",
    currenciesAccepted: "USD",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressLocality: HQ_LOCALITY,
      addressRegion: HQ_REGION,
      postalCode: HQ_POSTAL,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: HQ_GEO.latitude,
      longitude: HQ_GEO.longitude,
    },
    areaServed: SEO_LOCATIONS.map((loc) => ({
      "@type": "City",
      name: loc.area,
    })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "17:00",
      },
    ],
    ...(SAME_AS.length > 0 ? { sameAs: SAME_AS } : {}),
  };

  // Organization — drives the Knowledge Panel for brand-name searches.
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: company.name,
    url: SITE_URL,
    logo: company.logoUrl || `${SITE_URL}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: company.phone,
      contactType: "customer service",
      email: company.email,
      areaServed: "US",
      availableLanguage: ["English", "Spanish"],
    },
    ...(SAME_AS.length > 0 ? { sameAs: SAME_AS } : {}),
  };

  // WebSite — enables the site-name display and the search action.
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: company.name,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/vehicles?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-950 text-slate-300">
      <JsonLd data={businessLd} />
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
      <Navbar phone={company.phone} phoneHref={company.phoneHref} />
      <main className="flex-1">{children}</main>
      <Footer />
      {aiConfigured() && <ChatWidget companyName={company.name} />}
      <CookieConsent />
    </div>
  );
}
