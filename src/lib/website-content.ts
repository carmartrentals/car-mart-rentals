import { getSetting } from "@/lib/data/settings";

/** A single editable section of a website page. */
export interface PageSection {
  title: string;
  body: string;
}
export interface PageContent {
  sections: PageSection[];
}

/** The four editable pages. */
export const PAGE_KEYS = ["about", "faq", "terms", "privacy"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  about: "About Page",
  faq: "FAQ Page",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
};

// ---------------------------------------------------------------------------
// Default content — used until an admin saves a custom version.
// ---------------------------------------------------------------------------
export const DEFAULT_CONTENT: Record<PageKey, PageContent> = {
  about: {
    sections: [
      {
        title: "",
        body: "Car Mart Rentals is a full-service vehicle rental company serving public customers, insurance and body shop replacement clients, and Turo guests. Whether you need a head-turning luxury vehicle for a special occasion or a reliable replacement after an accident, our team makes the process effortless.",
      },
      {
        title: "",
        body: "Our carefully curated fleet ranges from the efficient Toyota Prius to the commanding Mercedes-AMG GLE 53 Coupe and the elegant Mercedes-Benz S500. Every vehicle is meticulously maintained, detailed and inspected before each rental.",
      },
      {
        title: "",
        body: "We work directly with insurance adjusters and repair shops to streamline claim-based rentals — handling direct billing and paperwork so you can focus on getting back on the road.",
      },
    ],
  },
  faq: {
    sections: [
      { title: "What do I need to rent a vehicle?", body: "A valid driver license, proof of insurance (or purchase of our liability protection), a major credit card for the security deposit, and you must be at least 21 years old. Drivers aged 21-24 incur a young-driver surcharge." },
      { title: "How does the security deposit work?", body: "A refundable security deposit is authorized on your card at pickup. It is released after the vehicle is returned and inspected, provided there is no damage, no outstanding fees and no policy violations. Deposit amounts vary by vehicle." },
      { title: "What is the mileage policy?", body: "Each rental includes a daily mileage allowance shown on the vehicle page. Mileage beyond the allowance is billed at the per-mile rate for that vehicle. Some rentals offer unlimited mileage." },
      { title: "Do you offer insurance replacement rentals?", body: "Yes. We work directly with insurance companies and body shops, including direct billing. Provide your claim number and adjuster details and we handle the rest." },
      { title: "Can I extend my rental?", body: "Absolutely. Contact us before your scheduled return time to request an extension. Extensions are subject to vehicle availability and current rates." },
      { title: "What is your fuel and charging policy?", body: "Return the vehicle with the same fuel or battery level as at pickup. Otherwise a refueling or recharging service fee plus the cost of fuel/charging applies." },
      { title: "What happens if the vehicle is returned late?", body: "A 59-minute grace period applies. Beyond that, late returns are billed at the hourly late fee, up to a full additional day's rate." },
      { title: "Do you deliver vehicles?", body: "Yes — delivery and pickup is available as an add-on. Select it during booking or ask our team for special arrangements." },
    ],
  },
  terms: {
    sections: [
      { title: "1. Rental Agreement", body: "By reserving a vehicle with Car Mart Rentals you agree to these Terms & Conditions and to the rental agreement signed at pickup. The renter must be the authorized driver named on the agreement." },
      { title: "2. Eligibility", body: "Renters must be at least 21 years of age, hold a valid driver license, and present proof of insurance or purchase liability protection. Drivers aged 21-24 are subject to a young-driver surcharge." },
      { title: "3. Security Deposit", body: "A refundable security deposit is authorized at check-out. It is released after the vehicle is returned and inspected, subject to no damage, outstanding fees or policy violations." },
      { title: "4. Mileage", body: "Daily mileage allowances apply as stated on each vehicle. Excess mileage is billed at the per-mile rate for that vehicle." },
      { title: "5. Fuel & Charging", body: "Vehicles must be returned at the same fuel or battery level as at pickup. A service fee plus fuel/charging cost applies otherwise." },
      { title: "6. Late Returns", body: "A 59-minute grace period applies. Beyond that, late returns are billed at the hourly late fee up to a full additional day." },
      { title: "7. Prohibited Use", body: "Vehicles may not be used for racing, towing, off-road driving, illegal activity, or driven by unauthorized persons. Smoking and vaping are prohibited in all vehicles." },
      { title: "8. Damage & Liability", body: "The renter is responsible for damage to the vehicle during the rental period. Damage is documented at check-out and check-in. Repair costs may be charged to the renter or deposit." },
      { title: "9. Tolls & Citations", body: "The renter is responsible for all tolls, parking tickets, traffic citations and related administrative fees incurred during the rental period." },
      { title: "10. Cancellations", body: "Cancellations made more than 48 hours before pickup are free. Later cancellations and no-shows are subject to fees as described in our cancellation policy." },
    ],
  },
  privacy: {
    sections: [
      { title: "Information We Collect", body: "We collect information you provide when booking — name, contact details, driver license, insurance documents and payment information — as well as rental history and vehicle usage data." },
      { title: "How We Use Your Information", body: "Your information is used to process reservations, verify eligibility, manage payments and deposits, coordinate insurance claims, communicate about your rental, and improve our services." },
      { title: "Document Storage", body: "Driver licenses, insurance documents and inspection photos are stored securely and access-controlled. They are retained only as long as necessary for legal, accounting and operational purposes." },
      { title: "Sharing of Information", body: "We share information with payment processors, and — for insurance rentals — with the relevant insurance company and body shop. We do not sell your personal information." },
      { title: "Payment Security", body: "Payments are processed through PCI-compliant providers. We do not store full card numbers on our systems." },
      { title: "Your Rights", body: "You may request access to, correction of, or deletion of your personal information, subject to legal retention requirements. Contact us to make a request." },
      { title: "Contact", body: "For privacy questions, contact us using the details on our Contact page." },
    ],
  },
};

/** Returns a page's content — the saved version, or the built-in default. */
export async function getPageContent(key: PageKey): Promise<PageContent> {
  const saved = await getSetting<PageContent | null>(`page_${key}`, null);
  if (saved && Array.isArray(saved.sections) && saved.sections.length > 0) {
    return saved;
  }
  return DEFAULT_CONTENT[key];
}
