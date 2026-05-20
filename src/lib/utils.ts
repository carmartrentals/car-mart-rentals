import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD currency. */
export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

/** Format a date string as "May 19, 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date string as "May 19, 2026, 3:30 PM". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format for <input type="datetime-local"> values. */
export function toDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Whole rental days between two dates (minimum 1, partial day rounds up). */
export function rentalDays(start: string | Date, end: string | Date): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const ms = e.getTime() - s.getTime();
  if (ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Slugify a string for URLs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convert a title-case enum value: "no_show" -> "No Show". */
export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Initials from a name, e.g. "Jane Smith" -> "JS". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** True when two date ranges overlap. */
export function rangesOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

/** Pick the best rate for a given number of days. */
export function bestRate(
  vehicle: {
    daily_rate: number;
    weekly_rate: number | null;
    monthly_rate: number | null;
  },
  days: number,
): { rateType: "daily" | "weekly" | "monthly"; total: number; perDay: number } {
  const daily = vehicle.daily_rate * days;
  let best: { rateType: "daily" | "weekly" | "monthly"; total: number; perDay: number } = {
    rateType: "daily",
    total: daily,
    perDay: vehicle.daily_rate,
  };

  if (vehicle.weekly_rate && days >= 7) {
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    const total = weeks * vehicle.weekly_rate + remDays * vehicle.daily_rate;
    if (total < best.total)
      best = { rateType: "weekly", total, perDay: total / days };
  }
  if (vehicle.monthly_rate && days >= 28) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    const total = months * vehicle.monthly_rate + remDays * vehicle.daily_rate;
    if (total < best.total)
      best = { rateType: "monthly", total, perDay: total / days };
  }
  return best;
}

/** Debounce helper for client components. */
export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
