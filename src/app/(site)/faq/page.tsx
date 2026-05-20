import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = { title: "Frequently Asked Questions" };

export default async function FaqPage() {
  const content = await getPageContent("faq");

  return (
    <>
      <PageHero
        eyebrow="Help Center"
        title="Frequently Asked Questions"
        description="Everything you need to know about renting with Car Mart Rentals."
      />
      <section className="bg-white py-14">
        <div className="container-px max-w-3xl space-y-3">
          {content.sections.map((f, i) => (
            <details
              key={i}
              className="group rounded-xl border border-slate-200 p-5 shadow-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                {f.title}
                <ChevronDown className="h-4 w-4 shrink-0 text-gold-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
