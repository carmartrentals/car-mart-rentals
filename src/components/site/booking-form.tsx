"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Tag,
  X,
  User,
  Plus,
  FileCheck,
  Lock,
  Clock,
} from "lucide-react";
import type { Vehicle, AddOn } from "@/lib/types/database";
import { formatCurrency, formatDateTime, rentalDays, bestRate } from "@/lib/utils";
import { saveBookingDraft, validatePromoCode } from "@/app/(site)/booking/actions";
import { trackEvent } from "@/lib/analytics";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-9 text-sm text-white " +
  "placeholder:text-slate-500 focus:border-gold-400 focus:outline-none " +
  "focus:ring-2 focus:ring-gold-400/25";

// Lightweight client-side validators — used to decide when to show the
// green "looks good" checkmark in the Input field. The server still
// validates definitively on submit.
function isValid(value: string, type: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (type === "tel") return v.replace(/\D/g, "").length >= 10;
  return v.length >= 1;
}

interface Prefill {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dl_number: string;
  dl_state: string;
}

export function BookingForm({
  vehicle,
  addOns,
  pickup,
  ret,
  prefill,
  refCode,
  taxRate,
}: {
  vehicle: Vehicle;
  addOns: AddOn[];
  pickup: string;
  ret: string;
  prefill?: Prefill | null;
  refCode?: string | null;
  /** Effective tax rate as a percentage (e.g. 9.75). Read from admin
   *  Settings on the server and passed in — never hardcoded here, so a
   *  Settings change propagates to the customer-facing checkout without
   *  a code release. */
  taxRate: number;
}) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [form, setForm] = useState({
    first_name: prefill?.first_name ?? "",
    last_name: prefill?.last_name ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    dl_number: prefill?.dl_number ?? "",
    dl_state: prefill?.dl_state ?? "",
    notes: "",
    referral_code: refCode ?? "",
  });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Promo code state — text in the input, plus the applied result once
  // validated by the server. discountAmount is in dollars, applied to the
  // pre-tax subtotal.
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{
    code: string;
    discountAmount: number;
    description: string | null;
    discountType: "percentage" | "fixed";
    discountValue: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromo] = useTransition();

  const days = rentalDays(pickup, ret);

  const quote = useMemo(() => {
    const rate = bestRate(vehicle, days);
    const addonsTotal = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .reduce(
        (sum, a) => sum + (a.price_type === "per_day" ? a.price * days : a.price),
        0,
      );
    const preDiscountSubtotal = rate.total + addonsTotal;
    const discount = promo ? Math.min(preDiscountSubtotal, promo.discountAmount) : 0;
    const subtotal = Math.max(0, preDiscountSubtotal - discount);
    const tax = subtotal * (taxRate / 100);
    return {
      rate,
      addonsTotal,
      preDiscountSubtotal,
      discount,
      subtotal,
      tax,
      total: subtotal + tax,
      deposit: vehicle.security_deposit,
    };
  }, [vehicle, addOns, selectedAddOns, days, promo, taxRate]);

  function applyPromo() {
    setPromoError(null);
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Enter a promo code first.");
      return;
    }
    startPromo(async () => {
      const res = await validatePromoCode({
        code,
        rentalDays: days,
        subtotalBeforeDiscount: quote.preDiscountSubtotal,
      });
      if (res.ok && res.code) {
        setPromo({
          code: res.code,
          discountAmount: res.discountAmount ?? 0,
          description: res.description ?? null,
          discountType: (res.discountType ?? "fixed") as "percentage" | "fixed",
          discountValue: res.discountValue ?? 0,
        });
        setPromoInput("");
      } else {
        setPromoError(res.error ?? "Could not validate that code.");
        setPromo(null);
      }
    });
  }

  function clearPromo() {
    setPromo(null);
    setPromoError(null);
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Save a draft when the customer enters their email, so we can follow up
  // if they don't complete the booking.
  function saveDraft() {
    if (!form.email.includes("@")) return;
    saveBookingDraft({
      email: form.email,
      firstName: form.first_name,
      vehicleId: vehicle.id,
      pickupAt: new Date(pickup).toISOString(),
      returnAt: new Date(ret).toISOString(),
    }).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree) {
      setError("Please accept the rental terms to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          pickup_at: new Date(pickup).toISOString(),
          return_at: new Date(ret).toISOString(),
          add_on_ids: selectedAddOns,
          customer: form,
          referral_code: form.referral_code,
          promo_code: promo?.code ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed.");
      // The big one — full conversion. Send value + vehicle context to GA4
      // so revenue reports work without further configuration.
      trackEvent("booking_completed", {
        reservation_number: data.reservation_number,
        vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        vehicle_id: vehicle.id,
        days,
        value: quote.total,
        currency: "USD",
      });
      setConfirmation(data.reservation_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </span>
        <h2 className="heading-display mt-4 text-2xl font-bold text-white">
          Reservation Request Received
        </h2>
        <p className="mt-2 text-slate-300">
          Your confirmation number is{" "}
          <span className="font-bold text-white">{confirmation}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Our team will contact you shortly to verify documents, collect payment
          and confirm your {vehicle.year} {vehicle.make} {vehicle.model}.
        </p>
        <Link
          href="/vehicles"
          className="mt-6 inline-block rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
        >
          Browse More Vehicles
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      // Extra bottom padding on mobile so the sticky checkout bar doesn't
      // overlap the last content. Cleared at lg+ where the bar is hidden.
      className="grid gap-8 pb-28 lg:grid-cols-[1.5fr_1fr] lg:pb-0"
    >
      {/* ------------------------------------------------------------- LEFT */}
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6">
          <SectionHeader
            icon={User}
            step={1}
            title="Driver Information"
            description={
              prefill
                ? "Pre-filled from your account — just check everything is still correct."
                : "Tell us who'll be driving so we can prepare the rental agreement."
            }
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="First Name" required value={form.first_name}
              onChange={(v) => setField("first_name", v)} />
            <Input label="Last Name" required value={form.last_name}
              onChange={(v) => setField("last_name", v)} />
            <Input label="Email" type="email" required value={form.email}
              onChange={(v) => setField("email", v)} onBlur={saveDraft} />
            <Input label="Phone" type="tel" required value={form.phone}
              onChange={(v) => setField("phone", v)} />
            <Input label="Driver License #" value={form.dl_number}
              onChange={(v) => setField("dl_number", v)} />
            <Input label="License State" value={form.dl_state}
              onChange={(v) => setField("dl_state", v)} />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Special Requests
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/25"
              placeholder="Delivery address, flight number, etc."
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Promo Code{" "}
                <span className="text-slate-500">(optional)</span>
              </label>
              {promo ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                    <Tag className="h-4 w-4" />
                    <span className="font-bold tracking-wider">{promo.code}</span>
                    <span className="text-xs font-normal text-emerald-300/80">
                      {promo.discountType === "percentage"
                        ? `−${promo.discountValue}%`
                        : `−${formatCurrency(promo.discountValue)}`}{" "}
                      applied
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={clearPromo}
                    className="rounded-md p-1 text-emerald-300 hover:bg-emerald-500/20"
                    aria-label="Remove promo code"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyPromo();
                        }
                      }}
                      placeholder="Enter promo code"
                      className={INPUT_CLASS + " flex-1"}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoPending || !promoInput.trim()}
                      className="shrink-0 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {promoPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                  {promoError && (
                    <p className="mt-1.5 text-xs text-rose-400">{promoError}</p>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Referral Code{" "}
                <span className="text-slate-500">(optional)</span>
              </label>
              <input
                value={form.referral_code}
                onChange={(e) => setField("referral_code", e.target.value)}
                placeholder="Friend's referral code"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>

        {addOns.length > 0 && (
          <section className="glass rounded-2xl p-6">
            <SectionHeader
              icon={Plus}
              step={2}
              title="Enhance Your Rental"
              description="Optional extras to make your trip better. Add or skip as you like."
            />
            <div className="mt-4 space-y-2.5">
              {addOns.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(a.id)}
                      onChange={() => toggleAddOn(a.id)}
                      className="h-4 w-4 accent-gold-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {a.name}
                      </p>
                      {a.description && (
                        <p className="text-xs text-slate-400">{a.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(a.price)}
                    <span className="text-xs font-normal text-slate-400">
                      /{a.price_type === "per_day" ? "day" : "rental"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="glass rounded-2xl p-6">
          <SectionHeader
            icon={FileCheck}
            step={addOns.length > 0 ? 3 : 2}
            title="Documents & Payment"
            description="How we'll wrap things up after you confirm."
          />
          <p className="mt-3 text-sm text-slate-400">
            After you submit this request, our team will securely collect your
            driver license, proof of insurance, and process your payment and
            refundable deposit. You will e-sign the rental agreement at pickup.
          </p>
          <label className="mt-4 flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-gold-500"
            />
            <span className="text-sm text-slate-400">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-gold-300 underline">
                Rental Terms &amp; Conditions
              </Link>{" "}
              and authorize Car Mart Rentals to contact me about this
              reservation.
            </span>
          </label>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------ SUMMARY CARD */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass rounded-2xl p-6">
          <div className="flex gap-3">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-900">
              {vehicle.main_image_url && (
                <Image
                  src={vehicle.main_image_url}
                  alt={vehicle.model}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <p className="font-semibold text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              <p className="text-xs text-slate-400">{vehicle.trim}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Pickup</dt>
              <dd className="font-medium text-slate-200">
                {formatDateTime(pickup)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Return</dt>
              <dd className="font-medium text-slate-200">
                {formatDateTime(ret)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Duration</dt>
              <dd className="font-medium text-slate-200">
                {days} day{days === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>

          <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
            <Row label={`Rental (${quote.rate.rateType})`}
              value={formatCurrency(quote.rate.total)} />
            {quote.addonsTotal > 0 && (
              <Row label="Add-ons" value={formatCurrency(quote.addonsTotal)} />
            )}
            {promo && quote.discount > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> Promo ({promo.code})
                </span>
                <span className="font-medium">
                  −{formatCurrency(quote.discount)}
                </span>
              </div>
            )}
            <Row label={`Tax (${taxRate}%)`} value={formatCurrency(quote.tax)} />
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
              <span>Total</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
            <Row label="Refundable deposit"
              value={formatCurrency(quote.deposit)} muted />
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting..." : "Confirm Reservation"}
          </button>

          {/* Trust strip — three reassurance points stacked on a narrow
              summary card. Reduces last-second hesitation when the visitor
              is about to commit to a luxury rental. */}
          <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
            <li className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-gold-300" />
              Secure request — your info is encrypted in transit
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-300" />
              No charge until our team confirms availability
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-gold-300" />
              Free cancellation up to 24 hours before pickup
            </li>
          </ul>
        </div>
      </div>

      {/* ------------------------------------------- MOBILE STICKY CHECKOUT */}
      {/* On phones the price summary is way below the form, so the visitor
          can't see the total while filling fields and has to scroll to
          submit. This bar pins the total + a second submit button to the
          bottom of the viewport on mobile only (lg:hidden). The button is
          inside the same <form>, so it submits naturally. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-950/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Total · {days} day{days === 1 ? "" : "s"}
            </p>
            <p className="truncate text-lg font-bold text-white">
              {formatCurrency(quote.total)}
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionHeader({
  icon: Icon,
  step,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-500/10 text-gold-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-300">
          Step {step}
        </p>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, onBlur, type = "text", required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
}) {
  // Show the green "looks good" check only after the visitor has typed
  // SOMETHING and the value validates. Empty fields stay neutral so the
  // form doesn't feel scolding before they've started.
  const valid = isValid(value, type);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={INPUT_CLASS}
        />
        {valid && (
          <CheckCircle2
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
            aria-label="Looks good"
          />
        )}
      </div>
    </div>
  );
}

function Row({
  label, value, muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-slate-500" : "text-slate-400"}`}>
      <span>{label}</span>
      <span className={muted ? "" : "font-medium text-slate-200"}>{value}</span>
    </div>
  );
}
