import type { Metadata } from "next";
import Link from "next/link";
import { Tag, CalendarClock, CheckCircle2, ArrowRight, Gift } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { PromoCodeBox } from "@/components/site/promo-code-box";
import { getActivePromoCodes } from "@/lib/data/promos";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Special Offers & Promo Codes",
  description:
    "Save on your next rental at Car Mart Rentals. Browse current promo codes and seasonal discounts on luxury and insurance-replacement vehicles in Van Nuys.",
  alternates: { canonical: "/offers" },
};
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = await getActivePromoCodes();

  return (
    <>
      <PageHero
        eyebrow="Save on Your Next Rental"
        title="Special Offers & Deals"
        description="Apply one of these promo codes at checkout to unlock your discount."
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          {offers.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <Gift className="mx-auto h-9 w-9 text-slate-600" />
              <h2 className="mt-3 text-base font-semibold text-white">
                No active offers right now
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Check back soon — or call us for our current rates.
              </p>
              <Link
                href="/vehicles"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
              >
                Browse Our Fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => {
                const headline =
                  o.discount_type === "percentage"
                    ? `${o.discount_value}% OFF`
                    : `${formatCurrency(o.discount_value)} OFF`;
                return (
                  <div
                    key={o.id}
                    className="glass glass-hover flex flex-col overflow-hidden rounded-2xl"
                  >
                    <div className="relative overflow-hidden border-b border-white/10 bg-brand-900 px-6 py-8 text-center">
                      <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-24" />
                      <Tag className="relative mx-auto h-5 w-5 text-gold-300" />
                      <p className="heading-display relative mt-2 text-3xl font-bold text-white">
                        {headline}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="flex-1 text-sm text-slate-400">
                        {o.description || "Limited-time discount on your rental."}
                      </p>

                      <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
                        {o.min_rental_days > 1 && (
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-gold-300" />
                            Minimum {o.min_rental_days}-day rental
                          </li>
                        )}
                        {o.valid_until && (
                          <li className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-gold-300" />
                            Valid through {formatDate(o.valid_until)}
                          </li>
                        )}
                      </ul>

                      <div className="mt-4">
                        <PromoCodeBox code={o.code} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {offers.length > 0 && (
            <div className="mt-12 text-center">
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
              >
                Browse Our Fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
