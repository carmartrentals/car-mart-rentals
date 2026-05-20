import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  BadgeCheck,
  Phone,
  FileCheck2,
  Car,
  ArrowRight,
} from "lucide-react";
import { getFeaturedVehicles } from "@/lib/data/vehicles";
import { VehicleCard } from "@/components/site/vehicle-card";
import { BookingSearch } from "@/components/site/booking-search";
import { COMPANY } from "@/lib/constants";

export default async function HomePage() {
  const featured = await getFeaturedVehicles(6);

  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative min-h-[640px] overflow-hidden bg-brand-950">
        <Image
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=80"
          alt="Luxury car"
          fill
          priority
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-px relative flex min-h-[640px] flex-col justify-center py-20">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
            <Sparkles className="h-4 w-4" /> {COMPANY.tagline}
          </p>
          <h1 className="heading-display max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Drive Something <span className="text-chrome">Extraordinary</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-200">
            Premium luxury rentals and insurance replacement vehicles. From the
            Mercedes-AMG GLE to the Tesla Model Y — your perfect car is one
            reservation away.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400"
            >
              Reserve Now <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={COMPANY.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <Link
              href="/insurance-rentals"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <FileCheck2 className="h-4 w-4" /> Insurance Claim Rental
            </Link>
          </div>

          <div className="mt-10 max-w-4xl">
            <BookingSearch />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- WHY CHOOSE US */}
      <section className="bg-white py-16">
        <div className="container-px">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BadgeCheck,
                title: "Premium Fleet",
                text: "Meticulously maintained luxury and everyday vehicles.",
              },
              {
                icon: ShieldCheck,
                title: "Insurance Approved",
                text: "Direct billing for insurance & body shop replacements.",
              },
              {
                icon: Clock,
                title: "Fast & Flexible",
                text: "Quick booking, delivery options and easy extensions.",
              },
              {
                icon: Sparkles,
                title: "Concierge Service",
                text: "White-glove pickup, drop-off and 24/7 support.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 p-6 shadow-card"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gold-50">
                  <f.icon className="h-5 w-5 text-gold-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ FEATURED FLEET */}
      <section className="bg-slate-50 py-16">
        <div className="container-px">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
                The Collection
              </p>
              <h2 className="heading-display mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
                Featured Vehicles
              </h2>
            </div>
            <Link
              href="/vehicles"
              className="hidden items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-gold-600 sm:flex"
            >
              View Full Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Car className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                Fleet is loading. Connect Supabase and run the seed migration to
                display vehicles.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- INSURANCE / LUXURY */}
      <section className="bg-white py-16">
        <div className="container-px grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-brand-950 p-8 text-white sm:p-10">
            <ShieldCheck className="absolute -right-6 -top-6 h-40 w-40 text-white/5" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
              For Claims
            </p>
            <h3 className="heading-display mt-2 text-2xl font-bold sm:text-3xl">
              Insurance Replacement Rentals
            </h3>
            <p className="mt-3 text-slate-300">
              In an accident? We work directly with your insurance company and
              body shop to keep you on the road. Direct billing, claim tracking
              and zero hassle.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-400" /> Direct insurance billing
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-400" /> Adjuster & claim coordination
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-400" /> Same-day vehicle availability
              </li>
            </ul>
            <Link
              href="/insurance-rentals"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 hover:bg-gold-400"
            >
              Get a Claim Rental <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 p-8 sm:p-10">
            <Sparkles className="absolute -right-6 -top-6 h-40 w-40 text-gold-100" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
              The Finer Things
            </p>
            <h3 className="heading-display mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Luxury Car Rentals
            </h3>
            <p className="mt-3 text-slate-600">
              Make an entrance. Our luxury collection — including the
              Mercedes-AMG GLE 53 Coupe and S500 — is perfect for weddings,
              business and special occasions.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-600" /> Late-model luxury vehicles
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-600" /> Daily, weekly & monthly rates
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-600" /> Delivery & concierge options
              </li>
            </ul>
            <Link
              href="/luxury-rentals"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Explore Luxury Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="bg-brand-950 py-16">
        <div className="container-px flex flex-col items-center text-center">
          <h2 className="heading-display text-3xl font-bold text-white sm:text-4xl">
            Ready to Reserve Your Vehicle?
          </h2>
          <p className="mt-3 max-w-xl text-slate-300">
            Book online in minutes or call our team. Luxury, comfort and
            reliability — whatever the journey.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-gold-400"
            >
              Reserve Now <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={COMPANY.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> {COMPANY.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
