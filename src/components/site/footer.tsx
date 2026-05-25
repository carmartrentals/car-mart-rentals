import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Music2,
  Star,
  MapPinned,
  Twitter,
  Youtube,
} from "lucide-react";
import { getCompanyProfile, getSocialLinks } from "@/lib/data/settings";
import { SEO_LOCATIONS } from "@/lib/locations-seo";
import { BrandLogo } from "@/components/brand-logo";

// Social icons render only when the corresponding URL is set in admin
// Settings — leave a field empty to hide that network. Each pulls its
// own appropriate icon from lucide so the footer looks consistent.
const SOCIAL_ICONS: Array<{
  key:
    | "instagram"
    | "facebook"
    | "tiktok"
    | "yelp"
    | "google_reviews"
    | "twitter"
    | "youtube";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "yelp", label: "Yelp", icon: Star },
  { key: "google_reviews", label: "Google Reviews", icon: MapPinned },
  { key: "twitter", label: "X / Twitter", icon: Twitter },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

export async function Footer() {
  const company = await getCompanyProfile();
  const social = await getSocialLinks();
  const socialEntries = SOCIAL_ICONS.filter(({ key }) => social[key]);
  return (
    <footer className="bg-brand-950 text-slate-300">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo className="h-14 w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Premium luxury car rentals and insurance replacement vehicles.
            Serving public, body shop and insurance customers.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
            Explore
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/vehicles" className="hover:text-gold-400">Our Fleet</Link></li>
            <li><Link href="/luxury-rentals" className="hover:text-gold-400">Luxury Rentals</Link></li>
            <li><Link href="/insurance-rentals" className="hover:text-gold-400">Insurance Rentals</Link></li>
            <li><Link href="/insurance-replacement" className="hover:text-gold-400">For Body Shops</Link></li>
            <li><Link href="/how-it-works" className="hover:text-gold-400">How It Works</Link></li>
            <li><Link href="/offers" className="hover:text-gold-400">Special Offers</Link></li>
            <li><Link href="/reviews" className="hover:text-gold-400">Reviews</Link></li>
            <li><Link href="/faq" className="hover:text-gold-400">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
            Company
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-gold-400">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-gold-400">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-gold-400">Contact</Link></li>
            <li><Link href="/terms" className="hover:text-gold-400">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-gold-400">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
            Get in Touch
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 text-gold-400" />
              <a
                href={company.phoneHref}
                data-ga="phone_click"
                data-ga-source="footer"
                className="hover:text-gold-400"
              >
                {company.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 text-gold-400" />
              <a href={`mailto:${company.email}`} className="hover:text-gold-400">
                {company.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 text-gold-400" />
              <span>{company.address}</span>
            </li>
          </ul>

          {socialEntries.length > 0 && (
            <>
              <h4 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white">
                Follow Us
              </h4>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {socialEntries.map(({ key, label, icon: Icon }) => (
                  <li key={key}>
                    <a
                      href={social[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:border-gold-400/50 hover:bg-gold-500/10 hover:text-gold-300"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px py-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service Areas
          </h4>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SEO_LOCATIONS.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/car-rental/${l.slug}`}
                  className="text-slate-400 hover:text-gold-400"
                >
                  Car Rental in {l.area}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/account" className="hover:text-gold-400">
              My Account
            </Link>
            <Link href="/admin" className="hover:text-gold-400">
              Staff Login
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
