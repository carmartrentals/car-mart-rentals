import type { Metadata } from "next";
import { ShieldCheck, Award, Users, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getPageContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "About Car Mart Rentals",
  description:
    "Van Nuys&rsquo; trusted source for luxury and insurance-replacement car rentals. Learn about the team, our standards, and why drivers across Los Angeles choose Car Mart Rentals.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const content = await getPageContent("about");

  return (
    <>
      <PageHero
        eyebrow="Who We Are"
        title="About Car Mart Rentals"
        description="A premium rental company built on trust, quality vehicles and genuine customer care."
      />
      <section className="bg-brand-950 py-16">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          <div className="space-y-5 text-slate-400">
            {content.sections.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <h2 className="mb-1.5 text-lg font-semibold text-white">
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
              <div key={c.title} className="glass glass-hover rounded-2xl p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <c.icon className="h-5 w-5 text-gold-300" />
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
