"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import { USER_ROLES } from "@/lib/constants";
import type { User } from "@/lib/types/database";

export function Topbar({
  user,
  onMenuClick,
}: {
  user: User;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-gold-400">
            {initials(user.full_name || user.email)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-slate-800">
              {user.full_name || user.email}
            </span>
            <span className="block text-xs text-slate-500">
              {USER_ROLES[user.role]}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-elevated">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-800">
                  {user.full_name || "Staff Member"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
