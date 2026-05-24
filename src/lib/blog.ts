/**
 * Blog articles — content-driven SEO. Each article is a typed object so we
 * don't need an MDX or CMS dependency. Add new articles by appending to the
 * ARTICLES array; everything else (listing page, detail page, sitemap,
 * structured data) updates automatically.
 *
 * Body sections render in order:
 *   { kind: "p", text }          — paragraph
 *   { kind: "h2", text }         — heading
 *   { kind: "list", items }      — bullet list
 *   { kind: "cta", label, href } — inline call-to-action button
 */

export type BlogSection =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "cta"; label: string; href: string };

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string; // ISO date
  updatedAt?: string;
  author: string;
  category: string;
  readingMinutes: number;
  // Lead image — used as the OG image for sharing. Local /public path or full URL.
  coverImage: string;
  coverAlt: string;
  body: BlogSection[];
  // Related internal links shown at the bottom of the article.
  related: { label: string; href: string }[];
}

export const ARTICLES: BlogArticle[] = [
  // ----------------------------------------------------------------------
  {
    slug: "what-to-do-after-a-car-accident-in-los-angeles",
    title:
      "What to Do After a Car Accident in Los Angeles (Step-by-Step Guide)",
    description:
      "Step-by-step guide for what to do after a car accident in Los Angeles — from the scene to insurance claim and replacement rental.",
    excerpt:
      "Just been in an accident? Here's exactly what to do in the next 24 hours — and how to get a replacement rental fast.",
    publishedAt: "2025-09-15",
    author: "Car Mart Rentals Team",
    category: "Insurance & Claims",
    readingMinutes: 6,
    coverImage: "/og-image.png",
    coverAlt:
      "What to do after a car accident in Los Angeles — Car Mart Rentals",
    body: [
      {
        kind: "p",
        text: "A car accident is stressful — but the steps you take in the first 24 hours can make the difference between a smooth claim and a months-long headache. This guide walks you through exactly what to do, in order, so nothing falls through the cracks.",
      },
      {
        kind: "h2",
        text: "1. Check for injuries and call 911",
      },
      {
        kind: "p",
        text: "Before anything else — make sure everyone is safe. If anyone is injured, call 911 immediately. Even minor accidents in California require a police report if there's any injury or property damage over $1,000, so requesting an officer to the scene is almost always a good idea.",
      },
      {
        kind: "h2",
        text: "2. Move to safety (if you can)",
      },
      {
        kind: "p",
        text: "If the cars are drivable and blocking traffic, move them to the shoulder or a nearby parking lot. Turn on hazard lights. Sitting in a busy intersection waiting for an officer is dangerous — California Vehicle Code §20002 actually requires you to move out of the lane if safely possible.",
      },
      {
        kind: "h2",
        text: "3. Exchange information",
      },
      {
        kind: "p",
        text: "Get the other driver's:",
      },
      {
        kind: "list",
        items: [
          "Full name and phone number",
          "Driver license number and state",
          "License plate number and vehicle make/model",
          "Insurance company name and policy number",
          "Names and phone numbers of any passengers or witnesses",
        ],
      },
      {
        kind: "h2",
        text: "4. Document everything with photos",
      },
      {
        kind: "p",
        text: "Use your phone to take clear photos of: every angle of both vehicles, the license plates, any visible injuries, the road conditions, traffic signs and signals, skid marks, and the other driver's insurance card and license. The more documentation you have, the faster your claim closes.",
      },
      {
        kind: "h2",
        text: "5. Call your insurance company",
      },
      {
        kind: "p",
        text: "Most insurers require notification within 24 hours of an accident. Have your policy number ready, plus the police report number if one was filed. Your insurer will assign a claim number and adjuster — write both down. You'll need them for everything that follows, including arranging a rental.",
      },
      {
        kind: "h2",
        text: "6. Arrange a replacement vehicle",
      },
      {
        kind: "p",
        text: "If your car is in the shop, your insurance policy likely includes rental reimbursement (look for it under \"Loss of Use\" or \"Transportation Expense\"). Most companies cover up to $30-$50 per day for 30 days. At Car Mart Rentals, we bill your insurer directly so there's no out-of-pocket payment from you — just give us your claim number, adjuster name, and we coordinate the rest.",
      },
      {
        kind: "cta",
        label: "Request an Insurance Replacement Rental",
        href: "/insurance-rentals",
      },
      {
        kind: "h2",
        text: "7. Get your car evaluated",
      },
      {
        kind: "p",
        text: "Take your car to a body shop your insurance approves (you usually have the right to pick the shop yourself — don't let the adjuster push you into one you don't trust). Our partner International Auto Collision Center handles repairs end-to-end and can coordinate the rental on the same visit.",
      },
      {
        kind: "h2",
        text: "8. Keep records of everything",
      },
      {
        kind: "p",
        text: "Save every receipt, every email, every doctor's note. If the other driver was at fault and you ever need to recover medical or rental costs, complete documentation is what makes it possible.",
      },
      {
        kind: "h2",
        text: "Need a replacement rental today?",
      },
      {
        kind: "p",
        text: "Car Mart Rentals serves drivers across Van Nuys and the San Fernando Valley with insurance-replacement rentals — direct billing, same-day pickup, full fleet. Call us with your claim number and we'll handle the rest.",
      },
      {
        kind: "cta",
        label: "Browse Replacement Vehicles",
        href: "/insurance-rentals",
      },
    ],
    related: [
      {
        label: "Insurance Replacement Rentals — How It Works",
        href: "/insurance-rentals",
      },
      { label: "Our Body Shop Partner", href: "/insurance-replacement" },
      { label: "Browse Our Fleet", href: "/vehicles" },
    ],
  },

  // ----------------------------------------------------------------------
  {
    slug: "best-luxury-cars-to-rent-for-a-wedding-in-los-angeles",
    title:
      "Best Luxury Cars to Rent for a Wedding in Los Angeles",
    description:
      "Planning a wedding in LA? Here are the best luxury cars to rent — Mercedes S-Class, AMG GLE, Tesla Model Y and more — with pricing and tips.",
    excerpt:
      "From Mercedes S-Class to Tesla Model Y — here's how to pick the right wedding rental, and what to expect for cost.",
    publishedAt: "2025-09-20",
    author: "Car Mart Rentals Team",
    category: "Luxury Rentals",
    readingMinutes: 5,
    coverImage: "/og-image.png",
    coverAlt:
      "Best luxury cars to rent for a wedding in Los Angeles — Car Mart Rentals",
    body: [
      {
        kind: "p",
        text: "Your wedding photos last forever — and so does the car in them. Whether you want timeless elegance, modern luxury, or pure stage-presence, picking the right rental sets the tone for the whole day. Here's how to choose, plus our picks from the Car Mart Rentals fleet in Van Nuys.",
      },
      {
        kind: "h2",
        text: "1. Mercedes-Benz S-Class — Timeless Elegance",
      },
      {
        kind: "p",
        text: "The S-Class has been the world's defining luxury sedan for sixty years. The current generation pairs hand-stitched leather, four-zone climate, and a back seat that genuinely feels like a private lounge. Perfect for traditional weddings, formal photography, and getting the bridal party to the venue in real comfort. Doors are wide enough for any gown.",
      },
      {
        kind: "h2",
        text: "2. Mercedes-AMG GLE 53 Coupe — Modern Statement",
      },
      {
        kind: "p",
        text: "For a more contemporary, athletic look — the AMG GLE 53 Coupe brings presence without being old-fashioned. It's tall enough for easy entry in any dress, has the room of an SUV, and the sloping coupe roofline makes it photograph beautifully from any angle. Great for outdoor venues, beach weddings, and couples who want something with more attitude than a traditional limousine.",
      },
      {
        kind: "h2",
        text: "3. Tesla Model Y — Modern, Quiet, Eco-Conscious",
      },
      {
        kind: "p",
        text: "Increasingly popular for daytime weddings and eco-minded couples. Whisper-quiet electric drive, panoramic glass roof for great natural light in photos, and zero fuel stops. The Model Y also has plenty of room for a wedding party of four or five plus a small bouquet rig.",
      },
      {
        kind: "h2",
        text: "What about a real classic or limousine?",
      },
      {
        kind: "p",
        text: "If you want a Rolls-Royce Phantom, vintage Bentley, or a stretch limo, those typically come from specialty wedding-car services and run $1,000+ per day. Our luxury fleet covers the modern luxury bracket — Mercedes-AMG, S-Class, BMW — at a fraction of that, which is why we're a popular choice for couples whose budget is going further on the venue and photographer.",
      },
      {
        kind: "h2",
        text: "How much does it cost?",
      },
      {
        kind: "p",
        text: "Most of our luxury wedding rentals run $200-$400 per day depending on the model. We offer weekend packages and concierge delivery to your venue — including major hotels along Wilshire, the Beverly Hills area, and Malibu. A typical wedding-day booking is one full day with delivery and pickup, which is the simplest way to do it.",
      },
      {
        kind: "h2",
        text: "Tips for booking a wedding rental",
      },
      {
        kind: "list",
        items: [
          "Reserve at least 30 days ahead — popular models book out fast in spring and fall",
          "Confirm whether your venue has any vehicle restrictions (some only allow certain parking)",
          "Ask about delivery — most couples don't want to drive themselves on the day",
          "Bring a clean handover plan — we'll inspect with you so the photos are picture-perfect",
          "Consider a backup plan for rain — covered drop-off matters",
        ],
      },
      {
        kind: "h2",
        text: "Ready to find your wedding car?",
      },
      {
        kind: "p",
        text: "Browse our full luxury fleet and check live availability. If you'd rather talk it through, our team can help you pick the right car for your venue, party size, and look.",
      },
      {
        kind: "cta",
        label: "Browse the Luxury Fleet",
        href: "/luxury-rentals",
      },
    ],
    related: [
      { label: "Luxury Car Rentals", href: "/luxury-rentals" },
      { label: "Mercedes-AMG GLE Rentals", href: "/vehicles" },
      { label: "How Renting Works", href: "/how-it-works" },
    ],
  },
];

export function getArticle(slug: string): BlogArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getRecentArticles(limit?: number): BlogArticle[] {
  const sorted = [...ARTICLES].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  return limit ? sorted.slice(0, limit) : sorted;
}
