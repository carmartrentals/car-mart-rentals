import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Privacy Policy" };

const SECTIONS = [
  {
    h: "Information We Collect",
    p: "We collect information you provide when booking — name, contact details, driver license, insurance documents and payment information — as well as rental history and vehicle usage data.",
  },
  {
    h: "How We Use Your Information",
    p: "Your information is used to process reservations, verify eligibility, manage payments and deposits, coordinate insurance claims, communicate about your rental, and improve our services.",
  },
  {
    h: "Document Storage",
    p: "Driver licenses, insurance documents and inspection photos are stored securely and access-controlled. They are retained only as long as necessary for legal, accounting and operational purposes.",
  },
  {
    h: "Sharing of Information",
    p: "We share information with payment processors, and — for insurance rentals — with the relevant insurance company and body shop. We do not sell your personal information.",
  },
  {
    h: "Payment Security",
    p: "Payments are processed through PCI-compliant providers. We do not store full card numbers on our systems.",
  },
  {
    h: "Your Rights",
    p: "You may request access to, correction of, or deletion of your personal information, subject to legal retention requirements. Contact us to make a request.",
  },
  {
    h: "Contact",
    p: "For privacy questions, contact us using the details on our Contact page.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
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
