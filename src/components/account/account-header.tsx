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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="container-px flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo className="h-9 w-auto sm:h-10" />
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-700">
            My Account
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 hover:text-gold-600"
            >
              {l.label}
            </Link>
          ))}
          <span className="text-sm text-slate-400">|</span>
          <span className="max-w-[150px] truncate text-sm font-medium text-slate-700">
            {customerName}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-slate-600 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-slate-200 bg-white sm:hidden",
          open ? "max-h-96" : "max-h-0",
          "transition-[max-height] duration-300",
        )}
      >
        <div className="container-px flex flex-col gap-1 py-3">
          <p className="px-2 pb-1 text-xs text-slate-400">
            Signed in as{" "}
            <span className="font-medium text-slate-600">{customerName}</span>
          </p>
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-gold-600"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
