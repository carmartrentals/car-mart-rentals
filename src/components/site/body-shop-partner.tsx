import Link from "next/link";
import { Wrench, CarFront, MapPin, ArrowRight, Phone } from "lucide-react";
import { getCompanyProfile } from "@/lib/data/settings";
import { BODY_SHOP } from "@/lib/constants";

/**
 * Promotes the "repair + rental in one place" partnership with the
 * collision-repair body shop.
 */
export async function BodyShopPartner() {
  const company = await getCompanyProfile();

  const points = [
    {
      icon: Wrench,
      title: "Trusted repair partner",
      text: `Quality collision repair handled by ${BODY_SHOP.name}.`,
    },
    {
      icon: CarFront,
      title: "Rental, same visit",
      text: "Pick up your replacement vehicle from us the day you drop your car off for repair.",
    },
    {
      icon: MapPin,
      title: "One coordinated process",
      text: "We line up the timing with the shop and your insurance — no running between places.",
    },
  ];

  return (
    <section className="border-t border-white/10 bg-brand-950 py-20">
      <div className="container-px">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-900 p-8 sm:p-10">
          <Wrench className="absolute -right-8 -top-8 h-44 w-44 text-white/[0.03]" />

          <p className="eyebrow relative">Repair &amp; Rental — One Stop</p>
          <h2 className="heading-display relative mt-2 text-2xl font-bold text-white sm:text-3xl">
            Need Collision Repair? We&apos;ve Got You Covered
          </h2>
          <p className="relative mt-3 max-w-2xl leading-relaxed text-slate-400">
            We&apos;ve partnered with{" "}
            <span className="font-semibold text-white">{BODY_SHOP.name}</span>{" "}
            so you can handle your repair and your rental together. Drop your
            car for collision repair, drive away in a replacement vehicle from
            us, and let our teams coordinate the rest.
          </p>

          <div className="relative mt-7 grid gap-5 sm:grid-cols-3">
            {points.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <p.icon className="h-5 w-5 text-gold-300" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-white">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-7 flex flex-wrap gap-3">
            <Link
              href="/insurance-rentals"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
            >
              Get a Replacement Rental <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={company.phoneHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> {company.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
