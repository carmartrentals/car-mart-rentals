import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { SEO_LOCATIONS } from "@/lib/locations-seo";

export const dynamic = "force-dynamic";

/** XML sitemap — lists every public page so search engines can crawl them. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "",
    "/vehicles",
    "/booking",
    "/contact",
    "/faq",
    "/offers",
    "/reviews",
    "/about",
    "/terms",
    "/privacy",
    "/luxury-rentals",
    "/insurance-rentals",
    "/insurance-replacement",
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  for (const loc of SEO_LOCATIONS) {
    entries.push({
      url: `${SITE_URL}/car-rental/${loc.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  try {
    const vehicles = await getPublicVehicles();
    for (const v of vehicles) {
      entries.push({
        url: `${SITE_URL}/vehicles/${v.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    /* vehicle pages are optional in the sitemap */
  }

  return entries;
}
