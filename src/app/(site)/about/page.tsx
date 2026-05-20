import type { Metadata } from "next";
import { ShieldCheck, Award, Users, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
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
            <p>
              Car Mart Rentals is a full-service vehicle rental company serving
              public customers, insurance and body shop replacement clients, and
              Turo guests. Whether you need a head-turning luxury vehicle for a
              special occasion or a reliable replacement after an accident, our
              team makes the process effortless.
            </p>
            <p>
              Our carefully curated fleet ranges from the efficient Toyota Prius
              to the commanding Mercedes-AMG GLE 53 Coupe and the elegant
              Mercedes-Benz S500. Every vehicle is meticulously maintained,
              detailed and inspected before each rental.
            </p>
            <p>
              We work directly with insurance adjusters and repair shops to
              streamline claim-based rentals — handling direct billing and
              paperwork so you can focus on getting back on the road.
            </p>
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
