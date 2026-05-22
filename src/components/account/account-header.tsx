"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "My Reservations" },
  { href: "/account/documents", label: "My Documents" },
  { href: "/account/refer", label: "Refer a Friend" },
  { href: "/account/profile", label: "Profile" },
  { href: "/vehicles", label: "Browse Fleet" },
];

export function AccountHeader({ customerName }: { customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/account/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/95 backdrop-blur">
      <div className="container-px flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo className="h-9 w-auto sm:h-10" />
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-300">
            My Account
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-gold-300"
            >
              {l.label}
            </Link>
          ))}
          <span className="text-sm text-white/20">|</span>
          <span className="max-w-[150px] truncate text-sm font-medium text-white">
            {customerName}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-slate-300 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-brand-950 sm:hidden",
          open ? "max-h-96" : "max-h-0",
          "transition-[max-height] duration-300",
        )}
      >
        <div className="container-px flex flex-col gap-1 py-3">
          <p className="px-2 pb-1 text-xs text-slate-500">
            Signed in as{" "}
            <span className="font-medium text-slate-300">{customerName}</span>
          </p>
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-gold-300"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
