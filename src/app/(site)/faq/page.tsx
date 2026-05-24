import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about renting from Car Mart Rentals — driver requirements, insurance, deposits, deliveries and more.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const content = await getPageContent("faq");

  // FAQPage schema — Google often turns this into an expandable FAQ rich result.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.sections.map((f) => ({
      "@type": "Question",
      name: f.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.body,
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <PageHero
        eyebrow="Help Center"
        title="Frequently Asked Questions"
        description="Everything you need to know about renting with Car Mart Rentals."
      />
      <section className="bg-brand-950 py-16">
        <div className="container-px max-w-3xl space-y-3">
          {content.sections.map((f, i) => (
            <details
              key={i}
              className="group glass glass-hover rounded-2xl p-5"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-white">
                {f.title}
                <ChevronDown className="h-4 w-4 shrink-0 text-gold-300 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                {f.body}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
