import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/constants";

/** Web app manifest — makes the site installable on phones as an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY.name} — ${COMPANY.tagline}`,
    short_name: COMPANY.name,
    description:
      "Premium luxury car rentals and insurance replacement vehicles.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c11",
    theme_color: "#0b0c11",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
