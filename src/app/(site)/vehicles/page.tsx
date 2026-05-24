import type { Metadata } from "next";
import Link from "next/link";
import { Car } from "lucide-react";
import { getPublicVehicles, type VehicleFilters } from "@/lib/data/vehicles";
import { VehicleCard } from "@/components/site/vehicle-card";
import { VehicleFilters as Filters } from "@/components/site/vehicle-filters";
import { CATEGORY_SEO } from "@/lib/vehicle-categories-seo";
import type { VehicleCategory, FuelType } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Our Fleet — Luxury & Insurance-Replacement Cars",
  description:
    "Browse the full Car Mart Rentals fleet — Mercedes-AMG, Tesla, BMW, Honda and more. Daily, weekly and monthly rates with pickup in Van Nuys, CA.",
  alternates: { canonical: "/vehicles" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const filters: VehicleFilters = {
    category: str(sp.category) as VehicleCategory | undefined,
    fuelType: str(sp.fuelType) as FuelType | undefined,
    seats: str(sp.seats) ? Number(str(sp.seats)) : undefined,
    maxPrice: str(sp.maxPrice) ? Number(str(sp.maxPrice)) : undefined,
    sort: str(sp.sort) as VehicleFilters["sort"],
  };

  const vehicles = await getPublicVehicles(filters);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-brand-950 py-20">
        <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-64" />
        <div className="container-px relative">
          <p className="eyebrow">Car Mart Rentals</p>
          <h1 className="heading-display mt-3 text-4xl font-bold text-white sm:text-5xl">
            Our Fleet
          </h1>
          <p className="mt-3 max-w-xl text-lg text-slate-400">
            From efficient hybrids to head-turning luxury — find the right
            vehicle for your journey.
          </p>

          {/* Category quick-links — internal SEO + faster discovery for users */}
          <div className="mt-7 flex flex-wrap gap-2">
            {CATEGORY_SEO.map((c) => (
              <Link
                key={c.slug}
                href={`/vehicles/category/${c.slug}`}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-gold-400/40 hover:bg-white/[0.08] hover:text-gold-300"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-950 py-12">
        <div className="container-px grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Filters />
          </div>

          <div>
            <p className="mb-4 text-sm text-slate-400">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}{" "}
              available
            </p>

            {vehicles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {vehicles.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-16 text-center">
                <Car className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-4 text-base font-semibold text-white">
                  No vehicles match your filters
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Try adjusting or clearing your filters to see more options.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
