import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { COMPANY } from "@/lib/constants";
import "./globals.css";

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
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s | ${COMPANY.name}`,
  },
  description:
    "Premium luxury car rentals and insurance replacement vehicles. Reserve a Mercedes-AMG, Tesla, and more from Car Mart Rentals.",
  keywords: [
    "luxury car rental",
    "insurance replacement rental",
    "exotic car rental",
    "Mercedes rental",
    "Tesla rental",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
