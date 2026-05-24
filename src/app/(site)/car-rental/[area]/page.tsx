import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { VehicleCard } from "@/components/site/vehicle-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { getCompanyProfile } from "@/lib/data/settings";
import { SEO_LOCATIONS, getSeoLocation } from "@/lib/locations-seo";
import { SITE_URL } from "@/lib/constants";

export function generateStaticParams() {
  return SEO_LOCATIONS.map((l) => ({ area: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const loc = getSeoLocation(area);
  if (!loc) return { title: "Car Rental" };
  return {
    title: `Luxury Car Rental in ${loc.area}`,
    description: `Luxury and insurance-replacement car rentals serving ${loc.area} and ${loc.region}. Hand-detailed vehicles, transparent pricing, easy local pickup.`,
    alternates: { canonical: `/car-rental/${loc.slug}` },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const loc = getSeoLocation(area);
  if (!loc) notFound();

  const [vehicles, company] = await Promise.all([
    getPublicVehicles(),
    getCompanyProfile(),
  ]);
  const featured = vehicles.slice(0, 6);

  // Per-city LocalBusiness — helps this page rank in the local pack for
  // searches like "car rental in <area>".
  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: `${company.name} — ${loc.area}`,
    description: loc.intro,
    url: `${SITE_URL}/car-rental/${loc.slug}`,
    telephone: company.phone,
    email: company.email,
    image: company.logoUrl || `${SITE_URL}/og-image.png`,
    priceRange: "$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressLocality: "Van Nuys",
      addressRegion: "CA",
      postalCode: "91406",
      addressCountry: "US",
    },
    areaServed: { "@type": "City", name: loc.area },
    parentOrganization: { "@id": `${SITE_URL}/#business` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: `Car Rental in ${loc.area}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={localBusinessLd} />
      <JsonLd data={breadcrumbLd} />
      <PageHero
        eyebrow={`Car Rental · ${loc.area}`}
        title={`Luxury Car Rental in ${loc.area}`}
        description={`Premium and insurance-replacement vehicles for ${loc.area} and ${loc.region}.`}
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-lg leading-relaxed text-slate-300">
                {loc.intro}
              </p>
              <p className="mt-4 leading-relaxed text-slate-400">
                Browse our fleet below, check live availability, and reserve
                online in minutes. Prefer to talk it through? Call{" "}
                <a
                  href={company.phoneHref}
                  className="font-medium text-gold-300 hover:text-gold-200"
                >
                  {company.phone}
                </a>{" "}
                and our team will help you find the right vehicle for{" "}
                {loc.area}.
              </p>
            </div>
            <ul className="glass space-y-3 rounded-2xl p-6">
              {loc.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2.5 text-sm text-slate-300"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="heading-display mt-14 text-2xl font-bold text-white">
            Vehicles available near {loc.area}
          </h2>
          {featured.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Our fleet is being updated — please check back soon.
            </p>
          )}

          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h3 className="heading-display text-xl font-bold text-white">
              Ready to book your {loc.area} rental?
            </h3>
            <p className="max-w-xl text-sm text-slate-400">
              Reserve online in minutes or speak with our team — luxury and
              insurance-replacement vehicles, ready when you are.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
              >
                Browse the Fleet <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={company.phoneHref}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> {company.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
