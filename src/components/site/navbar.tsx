"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { trackEvent } from "@/lib/analytics";

const LINKS = [
  { href: "/vehicles", label: "Our Fleet" },
  { href: "/luxury-rentals", label: "Luxury Rentals" },
  { href: "/insurance-rentals", label: "Insurance Rentals" },
  { href: "/insurance-replacement", label: "For Body Shops" },
  { href: "/offers", label: "Offers" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({
  phone,
  phoneHref,
}: {
  phone: string;
  phoneHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/95 backdrop-blur">
      <nav className="container-px flex h-20 items-center justify-between py-3">
        <Link href="/" className="flex items-center">
          <BrandLogo className="h-12 w-auto sm:h-14" priority />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-200 transition-colors hover:text-gold-400"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/account"
            className="text-sm font-medium text-slate-200 transition-colors hover:text-gold-400"
          >
            My Account
          </Link>
          <a
            href={phoneHref}
            onClick={() => trackEvent("phone_click", { source: "navbar" })}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-200 hover:text-gold-400"
          >
            <Phone className="h-4 w-4" />
            {phone}
          </a>
          <Link
            href="/vehicles"
            onClick={() => trackEvent("reserve_now_click", { source: "navbar" })}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400"
          >
            Reserve Now
          </Link>
        </div>

        <button
          className="text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-brand-950 lg:hidden",
          open ? "max-h-[36rem]" : "max-h-0",
          "transition-[max-height] duration-300",
        )}
      >
        <div className="container-px flex flex-col gap-1 py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-gold-400"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-gold-400"
          >
            <User className="h-4 w-4" /> My Account
          </Link>
          <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
            <a
              href={phoneHref}
              onClick={() => trackEvent("phone_click", { source: "navbar_mobile" })}
              className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-slate-200"
            >
              <Phone className="h-4 w-4" /> {phone}
            </a>
            <Link
              href="/vehicles"
              onClick={() => {
                setOpen(false);
                trackEvent("reserve_now_click", { source: "navbar_mobile" });
              }}
              className="rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-semibold text-brand-950"
            >
              Reserve Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
