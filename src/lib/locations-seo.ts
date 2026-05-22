/**
 * Local SEO landing pages — one per service area. Each has unique copy so
 * the page can rank for "luxury car rental in <area>" style searches.
 */
export interface SeoLocation {
  slug: string;
  area: string;
  region: string;
  intro: string;
  highlights: string[];
}

export const SEO_LOCATIONS: SeoLocation[] = [
  {
    slug: "van-nuys",
    area: "Van Nuys",
    region: "the San Fernando Valley",
    intro:
      "Car Mart Rentals is based right here in Van Nuys — your local source for luxury and insurance-replacement vehicles. Skip the airport counters and long lines: pick up a meticulously detailed car just minutes from home, the studios, or the 405.",
    highlights: [
      "Local pickup minutes away",
      "Insurance-replacement direct billing",
      "Luxury, exotic & everyday vehicles",
    ],
  },
  {
    slug: "sherman-oaks",
    area: "Sherman Oaks",
    region: "the San Fernando Valley",
    intro:
      "Renting a vehicle in Sherman Oaks has never been easier. Whether you need a head-turning luxury car for a night out on Ventura Boulevard or a reliable replacement after a collision, our nearby Van Nuys location makes pickup quick and effortless.",
    highlights: [
      "A short drive from Sherman Oaks",
      "Premium fleet, fully detailed",
      "Flexible daily, weekly & monthly rates",
    ],
  },
  {
    slug: "encino",
    area: "Encino",
    region: "the San Fernando Valley",
    intro:
      "Encino drivers trust Car Mart Rentals for premium vehicles without the dealership hassle. From weekend getaways to insurance-claim replacements, our team handles the details so you can simply get on the road.",
    highlights: [
      "Convenient for Encino residents",
      "Works directly with insurance & body shops",
      "Hand-picked luxury fleet",
    ],
  },
  {
    slug: "burbank",
    area: "Burbank",
    region: "the Los Angeles area",
    intro:
      "Need a vehicle in Burbank? Car Mart Rentals serves the Burbank media district and beyond with a curated fleet of luxury cars and dependable replacement vehicles — ideal for productions, visiting guests, or life after a fender-bender.",
    highlights: [
      "Great for Burbank studio & production needs",
      "Fast, paperwork-light pickup",
      "Direct insurance billing available",
    ],
  },
  {
    slug: "studio-city",
    area: "Studio City",
    region: "the San Fernando Valley",
    intro:
      "From Studio City to the hills, Car Mart Rentals delivers a premium rental experience. Choose from luxury and exotic vehicles that match the city's style, or arrange a comfortable insurance-replacement car while yours is in the shop.",
    highlights: [
      "Minutes from Studio City",
      "Luxury & exotic selection",
      "Concierge-style service",
    ],
  },
  {
    slug: "los-angeles",
    area: "Los Angeles",
    region: "Greater Los Angeles",
    intro:
      "Car Mart Rentals brings boutique, personal service to luxury and insurance-replacement rentals across Los Angeles. Instead of a crowded counter, you get a hand-detailed vehicle and a team that knows your name.",
    highlights: [
      "Serving Greater Los Angeles",
      "Luxury, exotic & replacement vehicles",
      "Transparent pricing, no surprises",
    ],
  },
];

export function getSeoLocation(slug: string): SeoLocation | undefined {
  return SEO_LOCATIONS.find((l) => l.slug === slug);
}
