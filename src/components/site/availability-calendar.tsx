"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookedRange } from "@/lib/data/vehicles";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** Public month calendar showing which dates a vehicle is booked. */
export function AvailabilityCalendar({
  bookedRanges,
}: {
  bookedRanges: BookedRange[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });

  const bookedDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of bookedRanges) {
      const s = new Date(r.start);
      s.setHours(0, 0, 0, 0);
      const e = new Date(r.end);
      e.setHours(0, 0, 0, 0);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    }
    return set;
  }, [bookedRanges]);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const monthLabel = new Date(view.y, view.m, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function shift(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }
  const atStart = view.y === today.getFullYear() && view.m === today.getMonth();

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Availability</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            disabled={atStart}
            aria-label="Previous month"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium text-white">
            {monthLabel}
          </span>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => (
          <div
            key={i}
            className="pb-1 text-[11px] font-semibold uppercase text-slate-500"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const date = new Date(view.y, view.m, day);
          const isPast = date < today;
          const isBooked = bookedDays.has(`${view.y}-${view.m}-${day}`);
          return (
            <div
              key={i}
              className={[
                "flex h-9 items-center justify-center rounded-md text-sm",
                isPast
                  ? "text-slate-600"
                  : isBooked
                    ? "bg-rose-500/15 text-rose-300 line-through"
                    : "bg-emerald-500/10 font-medium text-emerald-300",
              ].join(" ")}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/20 ring-1 ring-emerald-500/40" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-500/20 ring-1 ring-rose-500/40" />
          Booked
        </span>
      </div>
    </div>
  );
}
