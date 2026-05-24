import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Gem, Crown, Calendar, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { VehicleCard } from "@/components/site/vehicle-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { SITE_URL, COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Luxury Car Rentals in Van Nuys & Los Angeles",
  description:
    "Rent premium luxury and sports vehicles — Mercedes-AMG, S-Class, BMW and more. Daily, weekly and monthly rates with pickup in Van Nuys, CA.",
  alternates: { canonical: "/luxury-rentals" },
};

const SERVICE_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Luxury Car Rental",
  name: "Luxury Car Rentals",
  description:
    "Premium and exotic vehicle rentals — Mercedes-AMG, S-Class and more — for weddings, business and special occasions.",
  url: `${SITE_URL}/luxury-rentals`,
  provider: { "@id": `${SITE_URL}/#business`, "@type": "AutoRental", name: COMPANY.name },
  areaServed: [
    { "@type": "City", name: "Van Nuys" },
    { "@type": "City", name: "Los Angeles" },
    { "@type": "City", name: "Sherman Oaks" },
    { "@type": "City", name: "Encino" },
    { "@type": "City", name: "Burbank" },
    { "@type": "City", name: "Studio City" },
  ],
};

export default async function LuxuryRentalsPage() {
  const all = await getPublicVehicles({ sort: "price_desc" });
  const fleet = all.filter((v) => ["luxury", "sports"].includes(v.category));

  return (
    <>
      <JsonLd data={SERVICE_LD} />
      <PageHero
        eyebrow="The Finer Things"
        title="Luxury Car Rentals"
        description="Arrive in style. Our luxury collection is perfect for weddings, business, photoshoots and life's standout moments."
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: Crown, title: "Prestige Vehicles", text: "Mercedes-AMG, S-Class and premium sports cars." },
              { icon: Gem, title: "Showroom Condition", text: "Detailed and inspected before every rental." },
              { icon: Calendar, title: "Flexible Terms", text: "Daily, weekend, weekly and monthly rates." },
            ].map((c) => (
              <div key={c.title} className="glass glass-hover rounded-2xl p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <c.icon className="h-5 w-5 text-gold-300" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{c.text}</p>
              </div>
            ))}
          </div>

          {fleet.length > 0 ? (
            <div className="mt-14">
              <h2 className="heading-display flex items-center gap-2 text-2xl font-bold text-white">
                <Sparkles className="h-5 w-5 text-gold-300" /> The Luxury Collection
              </h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {fleet.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-10 text-slate-400">
              Our luxury collection is being updated. Please check back soon.
            </p>
          )}

          <div className="relative mt-14 flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-brand-900 p-10 text-center sm:p-12">
            <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-48" />
            <h3 className="heading-display relative text-2xl font-bold text-white sm:text-3xl">
              Reserve Your Luxury Experience
            </h3>
            <p className="relative mt-2 max-w-xl text-slate-400">
              Delivery, concierge pickup and special-occasion packages available.
            </p>
            <Link
              href="/vehicles?category=luxury"
              className="relative mt-6 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Browse Luxury Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
