"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, Car } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/vehicles", label: "Our Fleet" },
  { href: "/luxury-rentals", label: "Luxury Rentals" },
  { href: "/insurance-rentals", label: "Insurance Rentals" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/95 backdrop-blur">
      <nav className="container-px flex h-20 items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500">
            <Car className="h-5 w-5 text-brand-950" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="heading-display text-lg font-bold text-white">
              Car Mart
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold-400">
              Rentals
            </span>
          </span>
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

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={COMPANY.phoneHref}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-200 hover:text-gold-400"
          >
            <Phone className="h-4 w-4" />
            {COMPANY.phone}
          </a>
          <Link
            href="/vehicles"
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
          open ? "max-h-96" : "max-h-0",
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
          <div className="mt-2 flex flex-col gap-2">
            <a
              href={COMPANY.phoneHref}
              className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-slate-200"
            >
              <Phone className="h-4 w-4" /> {COMPANY.phone}
            </a>
            <Link
              href="/vehicles"
              onClick={() => setOpen(false)}
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
