import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { VehicleCard } from "@/components/site/vehicle-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { getCompanyProfile } from "@/lib/data/settings";
import {
  CATEGORY_SEO,
  getCategorySeo,
} from "@/lib/vehicle-categories-seo";
import { SITE_URL } from "@/lib/constants";

export function generateStaticParams() {
  return CATEGORY_SEO.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const seo = getCategorySeo(category);
  if (!seo) return { title: "Vehicles" };
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates: { canonical: `/vehicles/category/${seo.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const seo = getCategorySeo(category);
  if (!seo) notFound();

  const [allVehicles, company] = await Promise.all([
    getPublicVehicles({ category: seo.category }),
    getCompanyProfile(),
  ]);

  // ItemList — helps Google understand this is a list of products and may
  // earn a list-style rich snippet.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.metaTitle,
    itemListElement: allVehicles.slice(0, 20).map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/vehicles/${v.slug}`,
      name: `${v.year} ${v.make} ${v.model}`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Our Fleet",
        item: `${SITE_URL}/vehicles`,
      },
      { "@type": "ListItem", position: 3, name: seo.label },
    ],
  };

  return (
    <>
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <PageHero
        eyebrow={seo.eyebrow}
        title={seo.heading}
        description={seo.intro}
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          {/* Highlights + Perfect-for */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-300">
                Why our {seo.label.toLowerCase()} fleet
              </h2>
              <ul className="mt-4 space-y-2.5">
                {seo.highlights.map((h) => (
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
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-300">
                Perfect for
              </h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {seo.perfectFor.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2.5 text-sm text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Fleet */}
          <div className="mt-14">
            <h2 className="heading-display text-2xl font-bold text-white sm:text-3xl">
              Available {seo.label} Vehicles
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {allVehicles.length} vehicle{allVehicles.length === 1 ? "" : "s"}{" "}
              ready to reserve
            </p>

            {allVehicles.length > 0 ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {allVehicles.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-12 text-center">
                <p className="text-sm text-slate-400">
                  Our {seo.label.toLowerCase()} fleet is being updated — please
                  check back soon, or call us for current availability.
                </p>
                <Link
                  href="/vehicles"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
                >
                  See Full Fleet <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h3 className="heading-display text-xl font-bold text-white">
              Ready to reserve your {seo.label.toLowerCase()} rental?
            </h3>
            <p className="max-w-xl text-sm text-slate-400">
              Reserve online in minutes or speak with our team. Pickup in Van
              Nuys, with delivery available across greater Los Angeles.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
              >
                Browse the Full Fleet <ArrowRight className="h-4 w-4" />
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
