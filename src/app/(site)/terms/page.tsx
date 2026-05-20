import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default async function TermsPage() {
  const content = await getPageContent("terms");

  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <section className="bg-white py-14">
        <div className="container-px max-w-3xl space-y-7">
          {content.sections.map((s, i) => (
            <div key={i}>
              {s.title && (
                <h2 className="text-base font-semibold text-slate-900">
                  {s.title}
                </h2>
              )}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
