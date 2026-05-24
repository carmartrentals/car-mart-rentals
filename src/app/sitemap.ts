import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getPublicVehicles } from "@/lib/data/vehicles";
import { SEO_LOCATIONS } from "@/lib/locations-seo";
import { CATEGORY_SEO } from "@/lib/vehicle-categories-seo";
import { ARTICLES } from "@/lib/blog";

export const dynamic = "force-dynamic";

/** XML sitemap — lists every public page so search engines can crawl them. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Static routes. /booking and /auth are intentionally excluded — they're
  // transactional and marked noindex / disallowed in robots.txt.
  const staticPaths = [
    "",
    "/vehicles",
    "/luxury-rentals",
    "/insurance-rentals",
    "/insurance-replacement",
    "/how-it-works",
    "/blog",
    "/offers",
    "/reviews",
    "/faq",
    "/contact",
    "/about",
    "/terms",
    "/privacy",
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

  for (const cat of CATEGORY_SEO) {
    entries.push({
      url: `${SITE_URL}/vehicles/category/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const a of ARTICLES) {
    entries.push({
      url: `${SITE_URL}/blog/${a.slug}`,
      lastModified: new Date(a.updatedAt ?? a.publishedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  try {
    const vehicles = await getPublicVehicles();
    for (const v of vehicles) {
      entries.push({
        url: `${SITE_URL}/vehicles/${v.slug}`,
        // Real per-vehicle freshness signal — helps Google re-crawl when a
        // price or photo actually changes instead of on a fixed schedule.
        lastModified: v.updated_at ? new Date(v.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        // Image discovery — Google Image Search indexes these.
        ...(v.main_image_url ? { images: [v.main_image_url] } : {}),
      });
    }
  } catch {
    /* vehicle pages are optional in the sitemap */
  }

  return entries;
}
