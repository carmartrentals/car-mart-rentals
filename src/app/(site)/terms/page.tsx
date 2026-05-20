import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Terms & Conditions" };

const SECTIONS = [
  {
    h: "1. Rental Agreement",
    p: "By reserving a vehicle with Car Mart Rentals you agree to these Terms & Conditions and to the rental agreement signed at pickup. The renter must be the authorized driver named on the agreement.",
  },
  {
    h: "2. Eligibility",
    p: "Renters must be at least 21 years of age, hold a valid driver license, and present proof of insurance or purchase liability protection. Drivers aged 21-24 are subject to a young-driver surcharge.",
  },
  {
    h: "3. Security Deposit",
    p: "A refundable security deposit is authorized at check-out. It is released after the vehicle is returned and inspected, subject to no damage, outstanding fees or policy violations.",
  },
  {
    h: "4. Mileage",
    p: "Daily mileage allowances apply as stated on each vehicle. Excess mileage is billed at the per-mile rate for that vehicle.",
  },
  {
    h: "5. Fuel & Charging",
    p: "Vehicles must be returned at the same fuel or battery level as at pickup. A service fee plus fuel/charging cost applies otherwise.",
  },
  {
    h: "6. Late Returns",
    p: "A 59-minute grace period applies. Beyond that, late returns are billed at the hourly late fee up to a full additional day.",
  },
  {
    h: "7. Prohibited Use",
    p: "Vehicles may not be used for racing, towing, off-road driving, illegal activity, or driven by unauthorized persons. Smoking and vaping are prohibited in all vehicles.",
  },
  {
    h: "8. Damage & Liability",
    p: "The renter is responsible for damage to the vehicle during the rental period. Damage is documented at check-out and check-in. Repair costs may be charged to the renter or deposit.",
  },
  {
    h: "9. Tolls & Citations",
    p: "The renter is responsible for all tolls, parking tickets, traffic citations and related administrative fees incurred during the rental period.",
  },
  {
    h: "10. Cancellations",
    p: "Cancellations made more than 48 hours before pickup are free. Later cancellations and no-shows are subject to fees as described in our cancellation policy.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <section className="bg-white py-14">
        <div className="container-px max-w-3xl space-y-7">
          <p className="text-sm text-slate-500">Last updated: May 2026</p>
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="text-base font-semibold text-slate-900">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.p}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
