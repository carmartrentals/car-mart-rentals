import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const content = await getPageContent("privacy");

  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
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
