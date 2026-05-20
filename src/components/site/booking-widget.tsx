"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ShieldCheck, ArrowRight } from "lucide-react";
import type { Vehicle } from "@/lib/types/database";
import { formatCurrency, rentalDays, bestRate } from "@/lib/utils";

function defaults() {
  const p = new Date();
  p.setDate(p.getDate() + 1);
  p.setHours(10, 0, 0, 0);
  const r = new Date(p);
  r.setDate(r.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  return { p: fmt(p), r: fmt(r) };
}

export function BookingWidget({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const init = defaults();
  const [pickup, setPickup] = useState(init.p);
  const [ret, setRet] = useState(init.r);

  const quote = useMemo(() => {
    if (!pickup || !ret || new Date(ret) <= new Date(pickup)) return null;
    const days = rentalDays(pickup, ret);
    const rate = bestRate(vehicle, days);
    const subtotal = rate.total;
    const taxRate = 0.095;
    const tax = subtotal * taxRate;
    return {
      days,
      rateType: rate.rateType,
      perDay: rate.perDay,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [pickup, ret, vehicle]);

  function reserve() {
    const params = new URLSearchParams({
      vehicle: vehicle.slug,
      pickup,
      return: ret,
    });
    router.push(`/booking?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-slate-900">
          {formatCurrency(vehicle.daily_rate)}
          <span className="text-sm font-normal text-slate-500">/day</span>
        </p>
        <span className="text-xs text-slate-500">
          Deposit {formatCurrency(vehicle.security_deposit)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Pickup
          </label>
          <input
            type="datetime-local"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Return
          </label>
          <input
            type="datetime-local"
            value={ret}
            min={pickup}
            onChange={(e) => setRet(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          />
        </div>
      </div>

      {quote ? (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
          <Row
            label={`${formatCurrency(quote.perDay)} × ${quote.days} day${
              quote.days === 1 ? "" : "s"
            }`}
            value={formatCurrency(quote.subtotal)}
          />
          <Row label="Estimated tax (9.5%)" value={formatCurrency(quote.tax)} />
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
            <span>Estimated Total</span>
            <span>{formatCurrency(quote.total)}</span>
          </div>
          {quote.rateType !== "daily" && (
            <p className="text-xs text-emerald-600">
              {quote.rateType === "weekly" ? "Weekly" : "Monthly"} rate applied —
              you save vs. daily pricing.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-rose-600">
          Return must be after pickup.
        </p>
      )}

      <button
        onClick={reserve}
        disabled={!quote}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
      >
        Reserve This Vehicle <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> No charge until
        confirmed by our team
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
