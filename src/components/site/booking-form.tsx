"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import type { Vehicle, AddOn } from "@/lib/types/database";
import { formatCurrency, formatDateTime, rentalDays, bestRate } from "@/lib/utils";

const TAX_RATE = 0.095;

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white " +
  "placeholder:text-slate-500 focus:border-gold-400 focus:outline-none " +
  "focus:ring-2 focus:ring-gold-400/25";

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
}: {
  vehicle: Vehicle;
  addOns: AddOn[];
  pickup: string;
  ret: string;
  prefill?: Prefill | null;
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
  });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const days = rentalDays(pickup, ret);

  const quote = useMemo(() => {
    const rate = bestRate(vehicle, days);
    const addonsTotal = addOns
      .filter((a) => selectedAddOns.includes(a.id))
      .reduce(
        (sum, a) => sum + (a.price_type === "per_day" ? a.price * days : a.price),
        0,
      );
    const subtotal = rate.total + addonsTotal;
    const tax = subtotal * TAX_RATE;
    return {
      rate,
      addonsTotal,
      subtotal,
      tax,
      total: subtotal + tax,
      deposit: vehicle.security_deposit,
    };
  }, [vehicle, addOns, selectedAddOns, days]);

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed.");
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
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* ------------------------------------------------------------- LEFT */}
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white">
            Driver Information
          </h2>
          {prefill && (
            <p className="mt-1 text-xs text-gold-300">
              Pre-filled from your account — just check everything is still
              correct.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="First Name" required value={form.first_name}
              onChange={(v) => setField("first_name", v)} />
            <Input label="Last Name" required value={form.last_name}
              onChange={(v) => setField("last_name", v)} />
            <Input label="Email" type="email" required value={form.email}
              onChange={(v) => setField("email", v)} />
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
        </section>

        {addOns.length > 0 && (
          <section className="glass rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white">
              Enhance Your Rental
            </h2>
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
          <h2 className="text-base font-semibold text-white">
            Documents & Payment
          </h2>
          <p className="mt-2 text-sm text-slate-400">
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
            <Row label="Tax (9.5%)" value={formatCurrency(quote.tax)} />
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
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
            Secure request — no charge until confirmed
          </p>
        </div>
      </div>
    </form>
  );
}

function Input({
  label, value, onChange, type = "text", required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
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
