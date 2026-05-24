import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  CalendarCheck,
  ShieldCheck,
  KeyRound,
  CarFront,
  CheckCircle2,
  ArrowRight,
  Phone,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { getCompanyProfile } from "@/lib/data/settings";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How It Works — Renting from Car Mart Rentals",
  description:
    "From browsing the fleet to driving away — here's exactly how to rent a luxury or insurance-replacement vehicle from Car Mart Rentals in Van Nuys, CA.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  {
    icon: Search,
    title: "Browse the Fleet",
    body: "Pick the vehicle that fits your trip, occasion, or insurance claim. Filter by category, fuel type, seats and price — every car is hand-detailed and fully inspected.",
  },
  {
    icon: CalendarCheck,
    title: "Reserve Online in Minutes",
    body: "Choose your pickup and return dates, see the total upfront with no hidden fees, and confirm your booking. You'll receive instant email confirmation.",
  },
  {
    icon: ShieldCheck,
    title: "Verify Your Documents",
    body: "Upload a photo of your driver license (and insurance, if you have one). For insurance-claim rentals, share your claim number and we coordinate directly with your adjuster.",
  },
  {
    icon: KeyRound,
    title: "Pick Up or Get Delivery",
    body: "Collect your car at our Van Nuys location — or arrange concierge delivery to your home, office or the body shop. We'll walk you through the vehicle and hand over the keys.",
  },
  {
    icon: CarFront,
    title: "Drive & Enjoy",
    body: "Hit the road. Need an extension? Have a question? Our team is on call 7 days a week. Return the car at the agreed date and we handle the rest.",
  },
];

const FAQS = [
  {
    q: "What do I need to rent a car?",
    a: "A valid driver license (21+), proof of insurance, and a credit card for the security deposit hold. Drivers aged 21-24 may incur a young-driver surcharge.",
  },
  {
    q: "Do you offer insurance?",
    a: "Yes. You can use your own auto insurance, or we can sell you a short-term policy at pickup. For insurance-replacement rentals, we bill your insurer directly.",
  },
  {
    q: "Can you deliver the car?",
    a: "Yes — concierge delivery is available across the Van Nuys, Sherman Oaks, Encino, Burbank and Studio City areas. Ask us for a quote.",
  },
  {
    q: "Is there a mileage limit?",
    a: "Most rentals include 200 miles per day. Unlimited mileage upgrades and weekly/monthly rates are available — check the vehicle page for specifics.",
  },
];

export default async function HowItWorksPage() {
  const company = await getCompanyProfile();

  // HowTo schema — Google often shows this as a step-by-step rich result.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to rent a car from Car Mart Rentals",
    description:
      "Step-by-step guide to renting a luxury or insurance-replacement vehicle from Car Mart Rentals in Van Nuys, CA.",
    totalTime: "PT15M",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
      url: `${SITE_URL}/how-it-works#step-${i + 1}`,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "How It Works" },
    ],
  };

  return (
    <>
      <JsonLd data={howToLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />

      <PageHero
        eyebrow="Simple. Fast. Transparent."
        title="How It Works"
        description="From browsing the fleet to driving away — here's exactly how to rent a luxury or insurance-replacement car from Car Mart Rentals."
      />

      {/* Steps */}
      <section className="bg-brand-950 py-16">
        <div className="container-px">
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                id={`step-${i + 1}`}
                className="glass glass-hover relative overflow-hidden rounded-2xl p-7"
              >
                <span className="heading-display absolute right-5 top-3 text-5xl font-bold text-white/5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <s.icon className="h-6 w-6 text-gold-300" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-white">
                  {s.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-white/10 bg-brand-900 py-16">
        <div className="container-px max-w-3xl">
          <p className="eyebrow text-center">Quick Answers</p>
          <h2 className="heading-display mt-2 text-center text-3xl font-bold text-white">
            Common Questions
          </h2>
          <div className="mt-9 space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="glass rounded-2xl p-5">
                <h3 className="flex items-start gap-2 text-sm font-semibold text-white">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                  {f.q}
                </h3>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-400">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-sm text-slate-500">
            See the full{" "}
            <Link href="/faq" className="text-gold-300 hover:underline">
              FAQ
            </Link>{" "}
            for more.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-brand-950 py-20">
        <div className="container-px flex flex-col items-center text-center">
          <h2 className="heading-display max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Ready to Hit the Road?
          </h2>
          <p className="mt-3 max-w-xl text-slate-400">
            Browse the fleet, pick your dates and reserve in minutes.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Browse the Fleet <ArrowRight className="h-4 w-4" />
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
