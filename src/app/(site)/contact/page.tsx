import type { Metadata } from "next";
import {
  Phone, Mail, MapPin, ShieldCheck, FileCheck2, Star, Clock,
} from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ContactForm } from "@/components/site/contact-form";
import { getCompanyProfile, getBusinessHours, type DayKey } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Call, email or visit Car Mart Rentals in Van Nuys, CA. Open Mon–Sat for luxury rentals, insurance-replacement vehicles, and body-shop partnerships.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function fmtTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${h12}:00 ${ampm}`
    : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TRUST = [
  { icon: ShieldCheck, label: "Licensed & Insured" },
  { icon: FileCheck2, label: "Insurance Approved" },
  { icon: Star, label: "5-Star Rated Service" },
  { icon: Clock, label: "Fast & Flexible Booking" },
];

export default async function ContactPage() {
  const company = await getCompanyProfile();
  const hours = await getBusinessHours();
  const HOURS = (Object.keys(DAY_LABELS) as DayKey[]).map((d) => ({
    day: DAY_LABELS[d],
    time:
      !hours[d].open || !hours[d].close
        ? "Closed"
        : `${fmtTime(hours[d].open)} – ${fmtTime(hours[d].close)}`,
  }));
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

      <section className="bg-brand-950 py-16">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          {/* ----------------------------------------------------- LEFT COLUMN */}
          <div>
            <h2 className="text-lg font-semibold text-white">
              Reach Our Team
            </h2>
            <ul className="mt-5 space-y-4">
              {[
                { icon: Phone, label: "Phone", value: company.phone, href: company.phoneHref },
                { icon: Mail, label: "Email", value: company.email, href: `mailto:${company.email}` },
                { icon: MapPin, label: "Location", value: company.address },
              ].map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <c.icon className="h-5 w-5 text-gold-300" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {c.label}
                    </p>
                    {c.href ? (
                      <a href={c.href} className="text-slate-200 hover:text-gold-300">
                        {c.value}
                      </a>
                    ) : (
                      <p className="text-slate-200">{c.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Business hours */}
            <div className="mt-7 glass rounded-2xl p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-gold-300" /> Business Hours
              </h3>
              <ul className="mt-3 space-y-1.5">
                {HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex justify-between text-sm text-slate-400"
                  >
                    <span>{h.day}</span>
                    <span className="font-medium text-slate-200">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust badges */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {TRUST.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3"
                >
                  <t.icon className="h-5 w-5 shrink-0 text-gold-300" />
                  <span className="text-xs font-semibold text-slate-200">
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
      <section className="bg-brand-950 pb-16">
        <div className="container-px">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title={`Map to ${company.name}`}
              src={mapSrc}
              width="100%"
              height="380"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block w-full grayscale"
            />
          </div>
        </div>
      </section>
    </>
  );
}
