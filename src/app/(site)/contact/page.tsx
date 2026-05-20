import type { Metadata } from "next";
import {
  Phone, Mail, MapPin, ShieldCheck, FileCheck2, Star, Clock,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ContactForm } from "@/components/site/contact-form";
import { getCompanyProfile } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Contact Us" };
export const dynamic = "force-dynamic";

const HOURS = [
  { day: "Monday – Friday", time: "8:00 AM – 7:00 PM" },
  { day: "Saturday", time: "9:00 AM – 5:00 PM" },
  { day: "Sunday", time: "Closed" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Licensed & Insured" },
  { icon: FileCheck2, label: "Insurance Approved" },
  { icon: Star, label: "5-Star Rated Service" },
  { icon: Clock, label: "Fast & Flexible Booking" },
];

export default async function ContactPage() {
  const company = await getCompanyProfile();
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    company.address,
  )}&output=embed`;

  return (
    <>
      <PageHero
        eyebrow="Get in Touch"
        title={`Contact ${company.name}`}
        description="Questions about a rental, a quote or an insurance claim? We're here to help."
      />

      <section className="bg-white py-14">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          {/* ----------------------------------------------------- LEFT COLUMN */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Reach Our Team
            </h2>
            <ul className="mt-5 space-y-4">
              {[
                { icon: Phone, label: "Phone", value: company.phone, href: company.phoneHref },
                { icon: Mail, label: "Email", value: company.email, href: `mailto:${company.email}` },
                { icon: MapPin, label: "Location", value: company.address },
              ].map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-50">
                    <c.icon className="h-5 w-5 text-gold-600" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {c.label}
                    </p>
                    {c.href ? (
                      <a href={c.href} className="text-slate-800 hover:text-gold-600">
                        {c.value}
                      </a>
                    ) : (
                      <p className="text-slate-800">{c.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Business hours */}
            <div className="mt-7 rounded-xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 text-gold-600" /> Business Hours
              </h3>
              <ul className="mt-3 space-y-1.5">
                {HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex justify-between text-sm text-slate-600"
                  >
                    <span>{h.day}</span>
                    <span className="font-medium text-slate-800">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust badges */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {TRUST.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  <t.icon className="h-5 w-5 shrink-0 text-gold-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ---------------------------------------------------- RIGHT COLUMN */}
          <ContactForm />
        </div>
      </section>

      {/* ----------------------------------------------------------------- MAP */}
      <section className="bg-slate-50 pb-14">
        <div className="container-px">
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-card">
            <iframe
              title={`Map to ${company.name}`}
              src={mapSrc}
              width="100%"
              height="380"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block w-full"
            />
          </div>
        </div>
      </section>
    </>
  );
}
