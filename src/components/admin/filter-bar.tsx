"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Reusable admin list toolbar — debounced search + dropdown filters,
 * all synced to the URL query string.
 */
export function FilterBar({
  searchPlaceholder = "Search...",
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: FilterDef[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  // Debounced search.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;
    const t = setTimeout(() => setParam("q", search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters =
    !!params.get("q") || filters.some((f) => params.get(f.name));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        />
      </div>

      {filters.map((f) => (
        <select
          key={f.name}
          value={params.get(f.name) ?? ""}
          onChange={(e) => setParam(f.name, e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {hasFilters && (
        <button
          onClick={() => {
            setSearch("");
            router.push(pathname);
          }}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-rose-600"
        >
          <X className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
}
