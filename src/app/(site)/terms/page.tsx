import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Car Mart Rentals rental terms, driver requirements, insurance policies, fees and cancellation rules.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const content = await getPageContent("terms");

  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <section className="bg-brand-950 py-16">
        <div className="container-px max-w-3xl space-y-7">
          {content.sections.map((s, i) => (
            <div key={i}>
              {s.title && (
                <h2 className="text-base font-semibold text-white">
                  {s.title}
                </h2>
              )}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
