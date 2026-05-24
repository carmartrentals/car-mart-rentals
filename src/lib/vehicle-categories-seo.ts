import type { VehicleCategory } from "@/lib/types/database";

/**
 * SEO copy and metadata for each vehicle category. Each entry powers a static
 * landing page at /vehicles/category/<slug> that ranks for that category's
 * search intent (e.g. "luxury car rental Van Nuys", "SUV rental Los Angeles").
 */
export interface CategorySeo {
  category: VehicleCategory;
  slug: VehicleCategory;
  label: string;
  heading: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  highlights: string[];
  perfectFor: string[];
}

export const CATEGORY_SEO: CategorySeo[] = [
  {
    category: "luxury",
    slug: "luxury",
    label: "Luxury",
    heading: "Luxury Car Rentals",
    eyebrow: "The Finer Things",
    metaTitle: "Luxury Car Rentals in Van Nuys & Los Angeles",
    metaDescription:
      "Rent a Mercedes-AMG, S-Class, BMW or other premium luxury vehicle from Car Mart Rentals. Hand-detailed, fully inspected — pickup in Van Nuys, CA.",
    intro:
      "Arrive in style. Our luxury collection brings together the most coveted models from Mercedes-Benz, BMW, and other premium marques — every car hand-detailed and fully inspected before each rental.",
    highlights: [
      "Late-model Mercedes-AMG, S-Class and more",
      "Daily, weekend, weekly and monthly rates",
      "Concierge delivery in greater Los Angeles",
    ],
    perfectFor: [
      "Weddings & special occasions",
      "Business meetings & airport pickups",
      "Photoshoots & content creation",
      "Weekend getaways in style",
    ],
  },
  {
    category: "suv",
    slug: "suv",
    label: "SUV",
    heading: "SUV Rentals — Spacious & Capable",
    eyebrow: "Built for the Family",
    metaTitle: "SUV Rentals in Van Nuys, CA — Family-Sized Vehicles",
    metaDescription:
      "Rent a roomy SUV from Car Mart Rentals — perfect for family road trips, ski weekends and group outings. Late-model fleet, easy Van Nuys pickup.",
    intro:
      "Need room for the whole family or the gear for a weekend adventure? Our SUV fleet ranges from compact crossovers to full-size three-row haulers — all fully serviced and ready for the road.",
    highlights: [
      "5 to 7 passenger seating",
      "All-wheel drive options available",
      "Plenty of cargo for luggage and gear",
    ],
    perfectFor: [
      "Family road trips",
      "Ski & camping weekends",
      "Group outings & events",
      "Comfortable airport runs",
    ],
  },
  {
    category: "sedan",
    slug: "sedan",
    label: "Sedan",
    heading: "Sedan Rentals — Comfortable & Efficient",
    eyebrow: "Easy on the Road",
    metaTitle: "Sedan Rentals in Van Nuys, CA — Comfortable Daily Drivers",
    metaDescription:
      "Rent a comfortable, fuel-efficient sedan from Car Mart Rentals in Van Nuys. Toyota, Honda and premium models — perfect for daily driving and business travel.",
    intro:
      "Reliable, comfortable and easy on fuel — our sedan fleet covers everything from efficient daily commuters to plush long-distance cruisers. Ideal when you want a simple, capable car for the everyday.",
    highlights: [
      "Excellent fuel economy",
      "Smooth highway ride",
      "Easy to park around LA",
    ],
    perfectFor: [
      "Business travel",
      "Insurance-replacement rentals",
      "Daily commuting",
      "Long-distance trips",
    ],
  },
  {
    category: "sports",
    slug: "sports",
    label: "Sports",
    heading: "Sports Car Rentals",
    eyebrow: "Pure Performance",
    metaTitle: "Sports Car Rentals in Van Nuys & Los Angeles",
    metaDescription:
      "Rent a head-turning sports car from Car Mart Rentals in Van Nuys. Mustang, performance coupes and more — make any drive memorable.",
    intro:
      "Some drives deserve more than transportation. Our sports car selection is hand-picked for performance, presence, and that pure-driving feeling you only get behind a real driver's car.",
    highlights: [
      "Performance models with real character",
      "Stand out at any event",
      "Daily and weekend rates",
    ],
    perfectFor: [
      "Weekend canyon drives",
      "Birthday & anniversary surprises",
      "Pacific Coast Highway trips",
      "Special occasion gifts",
    ],
  },
  {
    category: "electric",
    slug: "electric",
    label: "Electric",
    heading: "Electric Car Rentals — Tesla & More",
    eyebrow: "Drive Electric",
    metaTitle: "Tesla & Electric Car Rentals in Van Nuys, CA",
    metaDescription:
      "Rent a Tesla or other electric vehicle from Car Mart Rentals in Van Nuys. Try before you buy, take a clean weekend trip, or drive HOV-eligible.",
    intro:
      "Quiet, quick, and clean. Our electric fleet — including Tesla — gives you instant torque, lower running costs, and access to LA's HOV lanes. Perfect for a test-drive before buying or just a smoother way to get around.",
    highlights: [
      "Tesla & other premium EVs",
      "HOV-lane eligible",
      "Lower per-mile cost than gas",
    ],
    perfectFor: [
      "Test-drive before buying an EV",
      "Eco-conscious travel",
      "HOV commuting",
      "Quiet, comfortable long drives",
    ],
  },
  {
    category: "economy",
    slug: "economy",
    label: "Economy",
    heading: "Economy Car Rentals",
    eyebrow: "Smart Value",
    metaTitle: "Economy Car Rentals in Van Nuys, CA — Best Daily Rates",
    metaDescription:
      "Affordable economy car rentals from Car Mart Rentals in Van Nuys. Great fuel economy, easy parking and the best daily rates in the San Fernando Valley.",
    intro:
      "When you just need a clean, reliable car at a great price, our economy fleet delivers. Excellent fuel economy, easy to park around the city, and friendly daily rates that don't sacrifice quality.",
    highlights: [
      "Best daily rates",
      "Outstanding fuel economy",
      "Easy parking in tight LA spots",
    ],
    perfectFor: [
      "Insurance-replacement rentals",
      "Visiting LA on a budget",
      "Short-term daily driving",
      "Errands & city trips",
    ],
  },
];

export function getCategorySeo(slug: string): CategorySeo | undefined {
  return CATEGORY_SEO.find((c) => c.slug === slug);
}
