import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getCompanyProfile } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const company = await getCompanyProfile();
  return (
    <>
      <PageHero
        eyebrow="Get in Touch"
        title={`Contact ${company.name}`}
        description="Questions about a rental, a quote or an insurance claim? We're here to help."
      />
      <section className="bg-white py-14">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Reach Our Team
            </h2>
            <ul className="mt-5 space-y-4">
              {[
                { icon: Phone, label: "Phone", value: company.phone, href: company.phoneHref },
                { icon: Mail, label: "Email", value: company.email, href: `mailto:${company.email}` },
                { icon: MapPin, label: "Location", value: company.address },
                { icon: Clock, label: "Hours", value: "Mon–Fri 8AM–7PM · Sat 9AM–5PM · Sun Closed" },
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
          </div>

          <form className="rounded-xl border border-slate-200 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">
              Send a Message
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input placeholder="Full Name" className="contact-input" />
              <input placeholder="Phone" className="contact-input" />
              <input placeholder="Email" type="email" className="contact-input sm:col-span-2" />
              <textarea
                placeholder="How can we help?"
                rows={4}
                className="contact-input sm:col-span-2"
              />
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 hover:bg-gold-400"
            >
              Send Message
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Or call us directly for the fastest response.
            </p>
          </form>
        </div>
      </section>
      <style>{`
        .contact-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
        }
        .contact-input:focus {
          outline: none;
          border-color: #c8a45c;
          box-shadow: 0 0 0 2px rgba(200,164,92,0.3);
        }
      `}</style>
    </>
  );
}
