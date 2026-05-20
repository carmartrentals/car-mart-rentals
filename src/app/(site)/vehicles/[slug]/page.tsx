import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Users, Fuel, Gauge, Settings2, Calendar, ShieldCheck,
  Cog, DoorOpen, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { getVehicleBySlug, getSimilarVehicles } from "@/lib/data/vehicles";
import { createClient } from "@/lib/supabase/server";
import { VehicleGallery } from "@/components/site/vehicle-gallery";
import { BookingWidget } from "@/components/site/booking-widget";
import { VehicleCard } from "@/components/site/vehicle-card";
import { VEHICLE_CATEGORIES, FUEL_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { AddOn } from "@/lib/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle Not Found" };
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: vehicle.description ?? undefined,
  };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const [similar, supabase] = await Promise.all([
    getSimilarVehicles(vehicle, 3),
    createClient(),
  ]);
  const { data: addOnsData } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const addOns = (addOnsData as AddOn[]) ?? [];

  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const specs = [
    { icon: Users, label: "Seats", value: `${vehicle.seats}` },
    { icon: DoorOpen, label: "Doors", value: `${vehicle.doors}` },
    { icon: Fuel, label: "Fuel", value: FUEL_TYPES[vehicle.fuel_type] },
    {
      icon: Settings2,
      label: "Transmission",
      value: vehicle.transmission === "automatic" ? "Automatic" : "Manual",
    },
    { icon: Cog, label: "Category", value: VEHICLE_CATEGORIES[vehicle.category] },
    {
      icon: Gauge,
      label: "Mileage Limit",
      value:
        vehicle.mileage_limit === 0
          ? "Unlimited"
          : `${vehicle.mileage_limit} mi/day`,
    },
  ];

  const pricing = [
    { label: "Daily", value: vehicle.daily_rate },
    { label: "Weekend", value: vehicle.weekend_rate },
    { label: "Weekly", value: vehicle.weekly_rate },
    { label: "Monthly", value: vehicle.monthly_rate },
  ].filter((p) => p.value != null) as { label: string; value: number }[];

  return (
    <div className="bg-slate-50">
      <div className="container-px py-8">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-gold-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Fleet
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* ----------------------------------------------------------- MAIN */}
          <div>
            <VehicleGallery images={vehicle.vehicle_images} name={name} />

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <span className="rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gold-700">
                {VEHICLE_CATEGORIES[vehicle.category]}
              </span>
              <h1 className="heading-display mt-2 text-3xl font-bold text-slate-900">
                {name}
              </h1>
              {vehicle.trim && (
                <p className="text-slate-500">{vehicle.trim} · {vehicle.color}</p>
              )}
              {vehicle.description && (
                <p className="mt-4 leading-relaxed text-slate-600">
                  {vehicle.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {specs.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <s.icon className="h-4 w-4 text-gold-600" />
                    <p className="mt-1.5 text-xs text-slate-500">{s.label}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            {vehicle.features.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Features & Equipment
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {vehicle.features.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing & policies */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Rates
                </h2>
                <ul className="mt-3 space-y-2">
                  {pricing.map((p) => (
                    <li
                      key={p.label}
                      className="flex justify-between text-sm text-slate-600"
                    >
                      <span>{p.label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(p.value)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-slate-100 pt-2 text-sm text-slate-600">
                    <span>Security Deposit</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(vehicle.security_deposit)}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Policies
                </h2>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Gauge className="mt-0.5 h-4 w-4 text-gold-600" />
                    {vehicle.mileage_limit === 0
                      ? "Unlimited mileage included."
                      : `${vehicle.mileage_limit} mi/day included, then ${formatCurrency(
                          vehicle.extra_mileage_fee,
                        )}/mi.`}
                  </li>
                  <li className="flex items-start gap-2">
                    <Fuel className="mt-0.5 h-4 w-4 text-gold-600" />
                    {vehicle.fuel_policy}
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-gold-600" />
                    Valid driver license & insurance required at pickup.
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-gold-600" />
                    Minimum age 21. Drivers 21-24 incur a young-driver surcharge.
                  </li>
                </ul>
              </div>
            </div>

            {/* Add-ons */}
            {addOns.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Available Add-ons
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {addOns.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {a.name}
                        </p>
                        {a.description && (
                          <p className="text-xs text-slate-500">
                            {a.description}
                          </p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
                        {formatCurrency(a.price)}
                        <span className="text-xs font-normal text-slate-500">
                          /{a.price_type === "per_day" ? "day" : "rental"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- SIDEBAR */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <BookingWidget vehicle={vehicle} />
          </div>
        </div>

        {/* Similar vehicles */}
        {similar.length > 0 && (
          <div className="mt-14">
            <h2 className="heading-display text-2xl font-bold text-slate-900">
              Similar Vehicles
            </h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
