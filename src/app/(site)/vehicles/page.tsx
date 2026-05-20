import type { Metadata } from "next";
import { Car } from "lucide-react";
import { getPublicVehicles, type VehicleFilters } from "@/lib/data/vehicles";
import { VehicleCard } from "@/components/site/vehicle-card";
import { VehicleFilters as Filters } from "@/components/site/vehicle-filters";
import type { VehicleCategory, FuelType } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Our Fleet",
  description: "Browse the Car Mart Rentals fleet of luxury and everyday vehicles.",
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
      <section className="border-b border-slate-200 bg-brand-950 py-12">
        <div className="container-px">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
            Car Mart Rentals
          </p>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white sm:text-4xl">
            Our Fleet
          </h1>
          <p className="mt-2 max-w-xl text-slate-300">
            From efficient hybrids to head-turning luxury — find the right
            vehicle for your journey.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-10">
        <div className="container-px grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Filters />
          </div>

          <div>
            <p className="mb-4 text-sm text-slate-500">
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
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
                <Car className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-800">
                  No vehicles match your filters
                </h3>
                <p className="mt-1 text-sm text-slate-500">
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
