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
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { getFeaturedVehicles } from "@/lib/data/vehicles";
import { VehicleCard } from "@/components/site/vehicle-card";
import { BookingSearch } from "@/components/site/booking-search";
import { ReviewCard } from "@/components/site/review-card";
import { StarRating } from "@/components/site/star-rating";
import { getCompanyProfile } from "@/lib/data/settings";
import { getReviewSummary } from "@/lib/data/reviews";

export default async function HomePage() {
  const [featured, company, reviewSummary] = await Promise.all([
    getFeaturedVehicles(6),
    getCompanyProfile(),
    getReviewSummary(6),
  ]);

  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative min-h-[88vh] overflow-hidden bg-brand-950">
        <Image
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=80"
          alt="Luxury car"
          fill
          priority
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="hero-vignette absolute inset-0" />
        <div className="container-px relative flex min-h-[88vh] flex-col justify-center py-24">
          <p className="eyebrow flex items-center gap-2 animate-rise">
            <span className="h-px w-8 bg-gold-400/60" />
            {company.tagline}
          </p>
          <h1 className="heading-display mt-5 max-w-4xl text-5xl font-bold leading-[1.05] text-white animate-rise sm:text-6xl lg:text-7xl">
            Drive Something <span className="text-chrome">Extraordinary</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 animate-rise-slow">
            Premium luxury rentals and insurance replacement vehicles. From the
            Mercedes-AMG GLE to the Tesla Model Y — your perfect car is one
            reservation away.
          </p>

          <div className="mt-9 flex flex-wrap gap-3 animate-rise-slow">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Reserve Now <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={company.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <Link
              href="/insurance-rentals"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <FileCheck2 className="h-4 w-4" /> Insurance Claim Rental
            </Link>
          </div>

          <div className="mt-12 max-w-4xl animate-rise-slow">
            <BookingSearch />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- WHY CHOOSE US */}
      <section className="relative border-t border-white/10 bg-brand-950 py-20">
        <div className="container-px">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                className="glass glass-hover rounded-2xl p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <f.icon className="h-5 w-5 text-gold-300" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- HOW IT WORKS */}
      <section className="relative overflow-hidden border-t border-white/10 bg-brand-900 py-20">
        <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-64" />
        <div className="container-px relative">
          <div className="text-center">
            <p className="eyebrow">Simple &amp; Fast</p>
            <h2 className="heading-display mt-2 text-3xl font-bold text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              From browsing to driving away in three effortless steps.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Car,
                step: "01",
                title: "Choose Your Vehicle",
                text: "Browse our fleet and pick the perfect car for your trip, occasion or insurance claim.",
              },
              {
                icon: FileCheck2,
                step: "02",
                title: "Book & Get Verified",
                text: "Reserve online in minutes and upload your driver license and insurance for quick approval.",
              },
              {
                icon: KeyRound,
                step: "03",
                title: "Pick Up & Drive",
                text: "Collect your vehicle — or have it delivered — and enjoy the road. It's that simple.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="glass glass-hover relative overflow-hidden rounded-2xl p-7"
              >
                <span className="heading-display absolute right-5 top-3 text-5xl font-bold text-white/5">
                  {s.step}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <s.icon className="h-6 w-6 text-gold-300" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ FEATURED FLEET */}
      <section className="border-t border-white/10 bg-brand-950 py-20">
        <div className="container-px">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">The Collection</p>
              <h2 className="heading-display mt-2 text-3xl font-bold text-white sm:text-4xl">
                Featured Vehicles
              </h2>
            </div>
            <Link
              href="/vehicles"
              className="hidden items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-gold-300 sm:flex"
            >
              View Full Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          ) : (
            <div className="mt-9 rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <Car className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Fleet is loading. Connect Supabase and run the seed migration to
                display vehicles.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- INSURANCE / LUXURY */}
      <section className="border-t border-white/10 bg-brand-900 py-20">
        <div className="container-px grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-950 p-8 sm:p-10">
            <ShieldCheck className="absolute -right-8 -top-8 h-44 w-44 text-white/[0.03]" />
            <p className="eyebrow">For Claims</p>
            <h3 className="heading-display mt-2 text-2xl font-bold text-white sm:text-3xl">
              Insurance Replacement Rentals
            </h3>
            <p className="mt-3 leading-relaxed text-slate-400">
              In an accident? We work directly with your insurance company and
              body shop to keep you on the road. Direct billing, claim tracking
              and zero hassle.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
              {[
                "Direct insurance billing",
                "Adjuster & claim coordination",
                "Same-day vehicle availability",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-gold-300" /> {t}
                </li>
              ))}
            </ul>
            <Link
              href="/insurance-rentals"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Get a Claim Rental <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-950 p-8 sm:p-10">
            <Sparkles className="absolute -right-8 -top-8 h-44 w-44 text-white/[0.03]" />
            <p className="eyebrow">The Finer Things</p>
            <h3 className="heading-display mt-2 text-2xl font-bold text-white sm:text-3xl">
              Luxury Car Rentals
            </h3>
            <p className="mt-3 leading-relaxed text-slate-400">
              Make an entrance. Our luxury collection — including the
              Mercedes-AMG GLE 53 Coupe and S500 — is perfect for weddings,
              business and special occasions.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
              {[
                "Late-model luxury vehicles",
                "Daily, weekly & monthly rates",
                "Delivery & concierge options",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-gold-300" /> {t}
                </li>
              ))}
            </ul>
            <Link
              href="/luxury-rentals"
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              Explore Luxury Fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- REVIEWS */}
      {reviewSummary.count > 0 && (
        <section className="border-t border-white/10 bg-brand-950 py-20">
          <div className="container-px">
            <div className="flex flex-col items-center text-center">
              <p className="eyebrow">Trusted by Drivers</p>
              <h2 className="heading-display mt-2 text-3xl font-bold text-white sm:text-4xl">
                What Our Customers Say
              </h2>
              <div className="mt-3 flex items-center gap-2">
                <StarRating rating={reviewSummary.average} size="md" />
                <span className="text-sm text-slate-400">
                  {reviewSummary.average.toFixed(1)} · {reviewSummary.count}{" "}
                  review{reviewSummary.count === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviewSummary.reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>

            <div className="mt-9 text-center">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-gold-300"
              >
                Read All Reviews <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- CTA */}
      <section className="relative overflow-hidden border-t border-white/10 bg-brand-900 py-24">
        <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-72" />
        <div className="container-px relative flex flex-col items-center text-center">
          <p className="eyebrow">Your Journey Awaits</p>
          <h2 className="heading-display mt-3 max-w-2xl text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to Reserve Your Vehicle?
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-slate-400">
            Book online in minutes or call our team. Luxury, comfort and
            reliability — whatever the journey.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Reserve Now <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={company.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> {company.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
