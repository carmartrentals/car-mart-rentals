"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle,
  Lock, CalendarCheck, Sparkles,
} from "lucide-react";
import type { Vehicle } from "@/lib/types/database";
import type { BookedRange } from "@/lib/data/vehicles";
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

export function BookingWidget({
  vehicle,
  bookedRanges = [],
  taxRate,
  cancellationHours,
}: {
  vehicle: Vehicle;
  bookedRanges?: BookedRange[];
  /** Effective tax rate as a percentage (e.g. 9.75). Read from admin
   *  Settings on the server and passed in so this preview matches the
   *  final checkout total. */
  taxRate: number;
  /** Free-cancellation window in hours, from admin Settings. */
  cancellationHours: number;
}) {
  const router = useRouter();
  const init = defaults();
  const [pickup, setPickup] = useState(init.p);
  const [ret, setRet] = useState(init.r);

  const quote = useMemo(() => {
    if (!pickup || !ret || new Date(ret) <= new Date(pickup)) return null;
    const days = rentalDays(pickup, ret);
    const rate = bestRate(vehicle, days);
    const subtotal = rate.total;
    const tax = subtotal * (taxRate / 100);
    return {
      days,
      rateType: rate.rateType,
      perDay: rate.perDay,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [pickup, ret, vehicle, taxRate]);

  // Real-time availability — does the chosen window overlap a booking?
  const conflict = useMemo(() => {
    if (!pickup || !ret) return false;
    const p = new Date(pickup).getTime();
    const r = new Date(ret).getTime();
    if (Number.isNaN(p) || Number.isNaN(r) || r <= p) return false;
    return bookedRanges.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return p < be && bs < r;
    });
  }, [pickup, ret, bookedRanges]);

  function reserve() {
    const params = new URLSearchParams({
      vehicle: vehicle.slug,
      pickup,
      return: ret,
    });
    router.push(`/booking?${params.toString()}`);
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-white">
          {formatCurrency(vehicle.daily_rate)}
          <span className="text-sm font-normal text-slate-400">/day</span>
        </p>
        <span className="text-xs text-slate-400">
          Deposit {formatCurrency(vehicle.security_deposit)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" /> Pickup
          </label>
          <input
            type="datetime-local"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className="widget-input"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" /> Return
          </label>
          <input
            type="datetime-local"
            value={ret}
            min={pickup}
            onChange={(e) => setRet(e.target.value)}
            className="widget-input"
          />
        </div>
      </div>

      {quote ? (
        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
          <Row
            label={`${formatCurrency(quote.perDay)} × ${quote.days} day${
              quote.days === 1 ? "" : "s"
            }`}
            value={formatCurrency(quote.subtotal)}
          />
          <Row label={`Estimated tax (${taxRate}%)`} value={formatCurrency(quote.tax)} />
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
            <span>Estimated Total</span>
            <span>{formatCurrency(quote.total)}</span>
          </div>
          {quote.rateType !== "daily" && (
            <p className="text-xs text-gold-300">
              {quote.rateType === "weekly" ? "Weekly" : "Monthly"} rate applied —
              you save vs. daily pricing.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 border-t border-white/10 pt-4 text-sm text-rose-400">
          Return must be after pickup.
        </p>
      )}

      {quote && (
        <div
          className={
            conflict
              ? "mt-3 flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
              : "mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
          }
        >
          {conflict ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Not available
              for these dates — please choose another window.
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Available for
              your selected dates.
            </>
          )}
        </div>
      )}

      <button
        onClick={reserve}
        disabled={!quote || conflict}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-40"
      >
        Reserve This Vehicle <ArrowRight className="h-4 w-4" />
      </button>
      <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <TrustItem icon={ShieldCheck}>
          No charge until your booking is confirmed
        </TrustItem>
        <TrustItem icon={CalendarCheck}>
          Free cancellation up to {cancellationHours} hours before pickup
        </TrustItem>
        <TrustItem icon={Lock}>
          Secure checkout — payments handled by Stripe
        </TrustItem>
        <TrustItem icon={Sparkles}>
          Every vehicle hand-detailed &amp; fully inspected
        </TrustItem>
      </ul>

      <style>{`
        .widget-input {
          height: 2.5rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 12, 17, 0.6);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #ffffff;
          color-scheme: dark;
        }
        .widget-input:focus {
          outline: none;
          border-color: #cbced4;
          box-shadow: 0 0 0 2px rgba(203, 206, 212, 0.25);
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  children,
}: {
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-xs text-slate-400">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" />
      <span>{children}</span>
    </li>
  );
}
