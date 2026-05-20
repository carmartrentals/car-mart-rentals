"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, Search } from "lucide-react";
import { VEHICLE_CATEGORIES } from "@/lib/constants";

function defaultDates() {
  const pickup = new Date();
  pickup.setHours(10, 0, 0, 0);
  pickup.setDate(pickup.getDate() + 1);
  const ret = new Date(pickup);
  ret.setDate(ret.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  return { pickup: fmt(pickup), ret: fmt(ret) };
}

export function BookingSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const init = defaultDates();
  const [pickup, setPickup] = useState(init.pickup);
  const [ret, setRet] = useState(init.ret);
  const [category, setCategory] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (ret) params.set("return", ret);
    if (category) params.set("category", category);
    router.push(`/vehicles?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSearch}
      className={`grid gap-3 rounded-xl bg-white p-4 shadow-elevated sm:p-5 ${
        compact ? "sm:grid-cols-4" : "lg:grid-cols-[1fr_1fr_1fr_auto]"
      }`}
    >
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" /> Pickup
        </label>
        <input
          type="datetime-local"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" /> Return
        </label>
        <input
          type="datetime-local"
          value={ret}
          min={pickup}
          onChange={(e) => setRet(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Car className="h-3.5 w-3.5" /> Vehicle Type
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        >
          <option value="">All Categories</option>
          {Object.entries(VEHICLE_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-6 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400"
        >
          <Search className="h-4 w-4" />
          Search Vehicles
        </button>
      </div>
    </form>
  );
}
