import Link from "next/link";
import { Car, Phone, Mail, MapPin } from "lucide-react";
import { COMPANY } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-brand-950 text-slate-300">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500">
              <Car className="h-5 w-5 text-brand-950" />
            </span>
            <span className="heading-display text-lg font-bold text-white">
              Car Mart Rentals
            </span>
          </div>
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
            <li><Link href="/faq" className="hover:text-gold-400">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
            Company
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-gold-400">About Us</Link></li>
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
              <a href={COMPANY.phoneHref} className="hover:text-gold-400">
                {COMPANY.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 text-gold-400" />
              <a href={`mailto:${COMPANY.email}`} className="hover:text-gold-400">
                {COMPANY.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 text-gold-400" />
              <span>{COMPANY.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
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
