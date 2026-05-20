import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, PhoneCall, CarFront, Receipt, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { VehicleCard } from "@/components/site/vehicle-card";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Insurance Replacement Rentals",
  description:
    "Replacement rental vehicles for insurance claims and body shop customers. Direct billing available.",
};

export default async function InsuranceRentalsPage() {
  const all = await getPublicVehicles({ sort: "price_asc" });
  const fleet = all
    .filter((v) => ["sedan", "suv", "economy", "electric"].includes(v.category))
    .slice(0, 3);

  const steps = [
    { icon: PhoneCall, title: "Contact Us", text: "Call with your claim number and adjuster details." },
    { icon: FileCheck2, title: "We Verify", text: "We coordinate directly with your insurance company." },
    { icon: CarFront, title: "Pick Up", text: "Drive away in a clean, reliable replacement vehicle." },
    { icon: Receipt, title: "Direct Billing", text: "We bill your insurer directly — minimal out of pocket." },
  ];

  return (
    <>
      <PageHero
        eyebrow="For Claims & Body Shops"
        title="Insurance Replacement Rentals"
        description="In an accident? Stay mobile while your vehicle is repaired. We handle the paperwork and bill your insurance directly."
      />

      <section className="bg-white py-14">
        <div className="container-px">
          <h2 className="heading-display text-2xl font-bold text-slate-900">
            How It Works
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-slate-200 p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-brand-950">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-gold-600" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-brand-950 p-8 text-white sm:p-10">
            <h3 className="heading-display text-2xl font-bold">
              We Work With All Major Insurers
            </h3>
            <p className="mt-2 max-w-2xl text-slate-300">
              Provide your claim number, insurance company and adjuster contact,
              and our team handles the rest. Body shops — call us to set up a
              referral partnership.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={COMPANY.phoneHref}
                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 hover:bg-gold-400"
              >
                <PhoneCall className="h-4 w-4" /> Call {COMPANY.phone}
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Request a Claim Rental <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {fleet.length > 0 && (
            <div className="mt-12">
              <h2 className="heading-display text-2xl font-bold text-slate-900">
                Popular Replacement Vehicles
              </h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {fleet.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
