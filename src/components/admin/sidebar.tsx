"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Car, Wrench,
  AlertTriangle, Users, FileText, CreditCard, BarChart3, Settings,
  ClipboardCheck, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/reservations", label: "Reservations", icon: ClipboardList },
      { href: "/admin/check", label: "Check-in / out", icon: ClipboardCheck },
    ],
  },
  {
    section: "Fleet",
    items: [
      { href: "/admin/vehicles", label: "Vehicles", icon: Car },
      { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
      { href: "/admin/damages", label: "Damages", icon: AlertTriangle },
    ],
  },
  {
    section: "People",
    items: [{ href: "/admin/customers", label: "Customers", icon: Users }],
  },
  {
    section: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices", icon: FileText },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    section: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-brand-950/60 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-950 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500">
              <Car className="h-4 w-4 text-brand-950" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-bold text-white">Car Mart</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-gold-400">
                Admin
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-gold-500 text-brand-950"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            ← View Public Website
          </Link>
        </div>
      </aside>
    </>
  );
}
