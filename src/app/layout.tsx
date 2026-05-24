import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { COMPANY, SITE_URL } from "@/lib/constants";
import "./globals.css";

// GA4 measurement ID — set NEXT_PUBLIC_GA_ID on Vercel to enable analytics.
// When unset (local dev, preview deploys), no script is loaded.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SITE_DESCRIPTION =
  "Premium luxury car rentals and insurance replacement vehicles. Reserve a Mercedes-AMG, Tesla, and more from Car Mart Rentals.";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s | ${COMPANY.name}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "luxury car rental",
    "insurance replacement rental",
    "exotic car rental",
    "Mercedes rental",
    "Tesla rental",
    "car rental Los Angeles",
    "car rental Van Nuys",
  ],
  // No site-wide canonical — each page sets its own via generateMetadata or
  // page-level metadata. A blanket canonical here would point every page at /.
  openGraph: {
    type: "website",
    siteName: COMPANY.name,
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${COMPANY.name} — ${COMPANY.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: COMPANY.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c11",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
