import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Car Mart Rentals collects, uses and protects your personal information when you book a rental or visit our website.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const content = await getPageContent("privacy");

  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
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
