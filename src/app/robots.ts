import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/** robots.txt — allow public pages, keep admin/account/api private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/auth", "/booking"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
