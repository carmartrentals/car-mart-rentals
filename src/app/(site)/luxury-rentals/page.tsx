import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Gem, Crown, Calendar, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { VehicleCard } from "@/components/site/vehicle-card";
import { getPublicVehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Luxury Car Rentals",
  description:
    "Rent premium luxury and sports vehicles — Mercedes-AMG, Mercedes-Benz S-Class and more.",
};

export default async function LuxuryRentalsPage() {
  const all = await getPublicVehicles({ sort: "price_desc" });
  const fleet = all.filter((v) => ["luxury", "sports"].includes(v.category));

  return (
    <>
      <PageHero
        eyebrow="The Finer Things"
        title="Luxury Car Rentals"
        description="Arrive in style. Our luxury collection is perfect for weddings, business, photoshoots and life's standout moments."
      />

      <section className="bg-white py-14">
        <div className="container-px">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: Crown, title: "Prestige Vehicles", text: "Mercedes-AMG, S-Class and premium sports cars." },
              { icon: Gem, title: "Showroom Condition", text: "Detailed and inspected before every rental." },
              { icon: Calendar, title: "Flexible Terms", text: "Daily, weekend, weekly and monthly rates." },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-slate-200 p-6 shadow-card">
                <c.icon className="h-6 w-6 text-gold-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>

          {fleet.length > 0 ? (
            <div className="mt-12">
              <h2 className="heading-display flex items-center gap-2 text-2xl font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-gold-600" /> The Luxury Collection
              </h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {fleet.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-10 text-slate-500">
              Our luxury collection is being updated. Please check back soon.
            </p>
          )}

          <div className="mt-12 flex flex-col items-center rounded-2xl bg-brand-950 p-8 text-center text-white sm:p-10">
            <h3 className="heading-display text-2xl font-bold">
              Reserve Your Luxury Experience
            </h3>
            <p className="mt-2 max-w-xl text-slate-300">
              Delivery, concierge pickup and special-occasion packages available.
            </p>
            <Link
              href="/vehicles?category=luxury"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-gold-400"
            >
              Browse Luxury Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
