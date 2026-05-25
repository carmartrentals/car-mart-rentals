import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Users, Fuel, Gauge, Settings2, Calendar, ShieldCheck,
  Cog, DoorOpen, CheckCircle2, ArrowLeft,
} from "lucide-react";
import {
  getVehicleBySlug, getSimilarVehicles, getVehicleBookedRanges,
} from "@/lib/data/vehicles";
import { createClient } from "@/lib/supabase/server";
import { getTaxRate } from "@/lib/data/settings";
import { VehicleGallery } from "@/components/site/vehicle-gallery";
import { BookingWidget } from "@/components/site/booking-widget";
import { AvailabilityCalendar } from "@/components/site/availability-calendar";
import { VehicleCard } from "@/components/site/vehicle-card";
import { ReviewCard } from "@/components/site/review-card";
import { StarRating } from "@/components/site/star-rating";
import { JsonLd } from "@/components/seo/json-ld";
import { VEHICLE_CATEGORIES, FUEL_TYPES, SITE_URL } from "@/lib/constants";
import { getVehicleReviewSummary } from "@/lib/data/reviews";
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
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  return {
    title: `${name} Rental in Van Nuys, CA`,
    description:
      vehicle.description ??
      `Rent the ${name} from Car Mart Rentals in Van Nuys. Daily, weekly and monthly rates with transparent pricing and easy pickup.`,
    alternates: { canonical: `/vehicles/${vehicle.slug}` },
    openGraph: vehicle.main_image_url
      ? {
          images: [{ url: vehicle.main_image_url, width: 1200, height: 800 }],
        }
      : undefined,
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

  const [similar, supabase, bookedRanges, vehicleReviews] = await Promise.all([
    getSimilarVehicles(vehicle, 3),
    createClient(),
    getVehicleBookedRanges(vehicle.id),
    getVehicleReviewSummary(vehicle.id, 6),
  ]);
  const { data: addOnsData } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const addOns = (addOnsData as AddOn[]) ?? [];
  // Live tax rate from Settings — passed to BookingWidget so the preview
  // matches the checkout. Read on every render via getTaxRate() so Settings
  // changes propagate site-wide.
  const taxRate = await getTaxRate();

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

  const vehicleLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name,
    ...(vehicle.description ? { description: vehicle.description } : {}),
    ...(vehicle.main_image_url ? { image: vehicle.main_image_url } : {}),
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    ...(vehicle.color ? { color: vehicle.color } : {}),
    vehicleSeatingCapacity: vehicle.seats,
    numberOfDoors: vehicle.doors,
    vehicleTransmission:
      vehicle.transmission === "automatic" ? "Automatic" : "Manual",
    fuelType: FUEL_TYPES[vehicle.fuel_type],
    ...(vehicle.odometer
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: vehicle.odometer,
            unitCode: "SMI",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: vehicle.daily_rate,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/vehicles/${vehicle.slug}`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: vehicle.daily_rate,
        priceCurrency: "USD",
        unitText: "day",
      },
      seller: {
        "@type": "AutoRental",
        "@id": `${SITE_URL}/#business`,
        name: "Car Mart Rentals",
      },
    },
    // Per-vehicle reviews — unlocks star ratings in search results.
    ...(vehicleReviews.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(vehicleReviews.average.toFixed(1)),
            reviewCount: vehicleReviews.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: vehicleReviews.reviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.reviewer_name || "Customer" },
            datePublished: r.created_at,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            ...(r.comment ? { reviewBody: r.comment } : {}),
          })),
        }
      : {}),
  };

  // BreadcrumbList — Home › Fleet › 2025 Toyota Camry SE.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Our Fleet",
        item: `${SITE_URL}/vehicles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
      },
    ],
  };

  return (
    <div className="bg-brand-950">
      <JsonLd data={vehicleLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="container-px py-8">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Fleet
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* ----------------------------------------------------------- MAIN */}
          <div>
            <VehicleGallery
              images={vehicle.vehicle_images}
              mainImageUrl={vehicle.main_image_url}
              name={name}
            />

            <div className="mt-6 glass rounded-2xl p-6">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-300">
                {VEHICLE_CATEGORIES[vehicle.category]}
              </span>
              <h1 className="heading-display mt-3 text-3xl font-bold text-white">
                {name}
              </h1>
              {vehicle.trim && (
                <p className="text-slate-400">{vehicle.trim} · {vehicle.color}</p>
              )}
              {vehicle.description && (
                <p className="mt-4 leading-relaxed text-slate-300">
                  {vehicle.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {specs.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <s.icon className="h-4 w-4 text-gold-300" />
                    <p className="mt-1.5 text-xs text-slate-400">{s.label}</p>
                    <p className="text-sm font-semibold text-white">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            {vehicle.features.length > 0 && (
              <div className="mt-6 glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white">
                  Features & Equipment
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {vehicle.features.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-300" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing & policies */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white">Rates</h2>
                <ul className="mt-3 space-y-2">
                  {pricing.map((p) => (
                    <li
                      key={p.label}
                      className="flex justify-between text-sm text-slate-400"
                    >
                      <span>{p.label}</span>
                      <span className="font-semibold text-white">
                        {formatCurrency(p.value)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-white/10 pt-2 text-sm text-slate-400">
                    <span>Security Deposit</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(vehicle.security_deposit)}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white">Policies</h2>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <Gauge className="mt-0.5 h-4 w-4 text-gold-300" />
                    {vehicle.mileage_limit === 0
                      ? "Unlimited mileage included."
                      : `${vehicle.mileage_limit} mi/day included, then ${formatCurrency(
                          vehicle.extra_mileage_fee,
                        )}/mi.`}
                  </li>
                  <li className="flex items-start gap-2">
                    <Fuel className="mt-0.5 h-4 w-4 text-gold-300" />
                    {vehicle.fuel_policy}
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-gold-300" />
                    Valid driver license & insurance required at pickup.
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-gold-300" />
                    Minimum age 21. Drivers 21-24 incur a young-driver surcharge.
                  </li>
                </ul>
              </div>
            </div>

            {/* Availability */}
            <div className="mt-6">
              <AvailabilityCalendar bookedRanges={bookedRanges} />
            </div>

            {/* Per-vehicle reviews */}
            {vehicleReviews.count > 0 && (
              <div className="mt-6 glass rounded-2xl p-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold text-white">
                    What renters say about this {vehicle.make} {vehicle.model}
                  </h2>
                  <div className="flex items-center gap-2">
                    <StarRating rating={vehicleReviews.average} size="sm" />
                    <span className="text-sm text-slate-400">
                      {vehicleReviews.average.toFixed(1)} ·{" "}
                      {vehicleReviews.count} review
                      {vehicleReviews.count === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {vehicleReviews.reviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {addOns.length > 0 && (
              <div className="mt-6 glass rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white">
                  Available Add-ons
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {addOns.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {a.name}
                        </p>
                        {a.description && (
                          <p className="text-xs text-slate-400">
                            {a.description}
                          </p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-white">
                        {formatCurrency(a.price)}
                        <span className="text-xs font-normal text-slate-400">
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
            <BookingWidget
              vehicle={vehicle}
              bookedRanges={bookedRanges}
              taxRate={taxRate}
            />
          </div>
        </div>

        {/* Similar vehicles */}
        {similar.length > 0 && (
          <div className="mt-16">
            <h2 className="heading-display text-2xl font-bold text-white">
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
