"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { VEHICLE_CATEGORIES, FUEL_TYPES } from "@/lib/constants";

export function VehicleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const get = (k: string) => params.get(k) ?? "";
  const hasFilters = ["category", "fuelType", "seats", "maxPrice", "sort"].some(
    (k) => params.get(k),
  );

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-gold-600" /> Filters
        </h2>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <Group label="Category">
          <select
            value={get("category")}
            onChange={(e) => update("category", e.target.value)}
            className="filter-control"
          >
            <option value="">All Categories</option>
            {Object.entries(VEHICLE_CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Group>

        <Group label="Fuel Type">
          <select
            value={get("fuelType")}
            onChange={(e) => update("fuelType", e.target.value)}
            className="filter-control"
          >
            <option value="">Any Fuel Type</option>
            {Object.entries(FUEL_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Group>

        <Group label="Minimum Seats">
          <select
            value={get("seats")}
            onChange={(e) => update("seats", e.target.value)}
            className="filter-control"
          >
            <option value="">Any</option>
            <option value="2">2+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
            <option value="7">7+</option>
          </select>
        </Group>

        <Group label="Max Daily Price">
          <select
            value={get("maxPrice")}
            onChange={(e) => update("maxPrice", e.target.value)}
            className="filter-control"
          >
            <option value="">Any Price</option>
            <option value="100">Up to $100</option>
            <option value="200">Up to $200</option>
            <option value="350">Up to $350</option>
            <option value="500">Up to $500</option>
          </select>
        </Group>

        <Group label="Sort By">
          <select
            value={get("sort")}
            onChange={(e) => update("sort", e.target.value)}
            className="filter-control"
          >
            <option value="">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </Group>
      </div>

      <style jsx>{`
        :global(.filter-control) {
          width: 100%;
          height: 2.5rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0 0.75rem;
          font-size: 0.875rem;
        }
        :global(.filter-control:focus) {
          outline: none;
          border-color: #c8a45c;
          box-shadow: 0 0 0 2px rgba(200, 164, 92, 0.3);
        }
      `}</style>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
