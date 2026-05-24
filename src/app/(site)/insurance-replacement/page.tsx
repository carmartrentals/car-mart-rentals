import type { Metadata } from "next";
import { FileCheck2, Clock, CarFront } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { InsuranceIntakeForm } from "@/components/site/insurance-intake-form";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Insurance-Replacement Rentals for Body Shops & Adjusters",
  description:
    "Body shops and insurance adjusters: submit a replacement-rental request for your client. Direct billing, fast turnaround, and a clean fleet.",
  alternates: { canonical: "/insurance-replacement" },
};

const SERVICE_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "B2B Insurance Replacement Rental Partnership",
  name: "Insurance-Replacement Rentals for Body Shops",
  description:
    "Body shop and adjuster partnership for insurance-replacement vehicles. Submit a request and we'll arrange the rental and direct-bill the insurer.",
  url: `${SITE_URL}/insurance-replacement`,
  provider: { "@id": `${SITE_URL}/#business`, "@type": "AutoRental", name: COMPANY.name },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Body shops, collision centers, insurance adjusters",
  },
  areaServed: { "@type": "State", name: "California" },
};

const BENEFITS = [
  {
    icon: FileCheck2,
    title: "Direct billing",
    body: "We work directly with insurers and shops — minimal paperwork for your client.",
  },
  {
    icon: Clock,
    title: "Fast turnaround",
    body: "Submit a request and we'll arrange the replacement vehicle quickly.",
  },
  {
    icon: CarFront,
    title: "Right-sized fleet",
    body: "From economy to SUV — a comparable, fully detailed replacement vehicle.",
  },
];

export default function InsuranceReplacementPage() {
  return (
    <>
      <JsonLd data={SERVICE_LD} />
      <PageHero
        eyebrow="For Body Shops & Adjusters"
        title="Insurance-Replacement Rentals"
        description="Submit a replacement-rental request for your client. We handle the vehicle and the billing — you keep your customer moving."
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Benefits */}
          <div>
            <h2 className="text-lg font-semibold text-white">
              Why partner with us
            </h2>
            <ul className="mt-5 space-y-4">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <b.icon className="h-5 w-5 text-gold-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {b.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 glass rounded-2xl p-5">
              <p className="text-sm leading-relaxed text-slate-400">
                Already have a claim in progress? Submit the details on the
                right and our team will take it from there — typically the same
                business day.
              </p>
            </div>
          </div>

          {/* Intake form */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Submit a Replacement Request
            </h2>
            <InsuranceIntakeForm />
          </div>
        </div>
      </section>
    </>
  );
}
