import type { Metadata } from "next";
import { ShieldCheck, Award, Users, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = { title: "About Us" };

export default async function AboutPage() {
  const content = await getPageContent("about");

  return (
    <>
      <PageHero
        eyebrow="Who We Are"
        title="About Car Mart Rentals"
        description="A premium rental company built on trust, quality vehicles and genuine customer care."
      />
      <section className="bg-white py-14">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-slate-600">
            {content.sections.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <h2 className="mb-1 text-lg font-semibold text-slate-900">
                    {s.title}
                  </h2>
                )}
                <p className="whitespace-pre-line leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Award, title: "Premium Fleet", text: "Late-model luxury & everyday vehicles." },
              { icon: ShieldCheck, title: "Insurance Partner", text: "Direct billing & claim coordination." },
              { icon: Users, title: "Customer First", text: "Concierge-level service every time." },
              { icon: HeartHandshake, title: "Trusted Local", text: "Proudly serving our community." },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-slate-200 p-5 shadow-card">
                <c.icon className="h-6 w-6 text-gold-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
