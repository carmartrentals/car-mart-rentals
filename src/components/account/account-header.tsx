"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export function AccountHeader({ customerName }: { customerName: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/account/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container-px flex h-16 items-center justify-between">
        <Link href="/account" className="flex items-center gap-2.5">
          <BrandLogo className="h-10 w-auto" />
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-700">
            My Account
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/account"
            className="hidden text-sm font-medium text-slate-600 hover:text-gold-600 sm:block"
          >
            My Reservations
          </Link>
          <Link
            href="/account/documents"
            className="hidden text-sm font-medium text-slate-600 hover:text-gold-600 sm:block"
          >
            My Documents
          </Link>
          <Link
            href="/vehicles"
            className="hidden text-sm font-medium text-slate-600 hover:text-gold-600 sm:block"
          >
            Browse Fleet
          </Link>
          <span className="hidden text-sm text-slate-400 sm:block">|</span>
          <span className="text-sm font-medium text-slate-700">{customerName}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
