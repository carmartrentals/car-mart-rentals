import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Frequently Asked Questions" };

const FAQS = [
  {
    q: "What do I need to rent a vehicle?",
    a: "A valid driver license, proof of insurance (or purchase of our liability protection), a major credit card for the security deposit, and you must be at least 21 years old. Drivers aged 21-24 incur a young-driver surcharge.",
  },
  {
    q: "How does the security deposit work?",
    a: "A refundable security deposit is authorized on your card at pickup. It is released after the vehicle is returned and inspected, provided there is no damage, no outstanding fees and no policy violations. Deposit amounts vary by vehicle.",
  },
  {
    q: "What is the mileage policy?",
    a: "Each rental includes a daily mileage allowance shown on the vehicle page. Mileage beyond the allowance is billed at the per-mile rate for that vehicle. Some rentals offer unlimited mileage.",
  },
  {
    q: "Do you offer insurance replacement rentals?",
    a: "Yes. We work directly with insurance companies and body shops, including direct billing. Provide your claim number and adjuster details and we handle the rest.",
  },
  {
    q: "Can I extend my rental?",
    a: "Absolutely. Contact us before your scheduled return time to request an extension. Extensions are subject to vehicle availability and current rates.",
  },
  {
    q: "What is your fuel and charging policy?",
    a: "Return the vehicle with the same fuel or battery level as at pickup. Otherwise a refueling or recharging service fee plus the cost of fuel/charging applies.",
  },
  {
    q: "What happens if the vehicle is returned late?",
    a: "A 59-minute grace period applies. Beyond that, late returns are billed at the hourly late fee, up to a full additional day's rate.",
  },
  {
    q: "Do you deliver vehicles?",
    a: "Yes — delivery and pickup is available as an add-on. Select it during booking or ask our team for special arrangements.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Help Center"
        title="Frequently Asked Questions"
        description="Everything you need to know about renting with Car Mart Rentals."
      />
      <section className="bg-white py-14">
        <div className="container-px max-w-3xl space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-slate-200 p-5 shadow-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-gold-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
