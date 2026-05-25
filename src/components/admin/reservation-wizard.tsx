"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  Save,
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Car,
  CalendarRange,
  DollarSign,
  ClipboardCheck,
  Check,
  CircleAlert,
  Info,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { initialActionState, type ActionState } from "@/lib/form";
import { computeReservationTotals } from "@/lib/pricing";
import { formatCurrency, toDateTimeLocal } from "@/lib/utils";
import { RESERVATION_STATUS, RESERVATION_SOURCES } from "@/lib/constants";
import type { Customer, Vehicle } from "@/lib/types/database";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

interface StepDef {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tip shown in the help panel for this step. */
  help: { title: string; body: React.ReactNode };
}

const STEPS: StepDef[] = [
  {
    id: 1,
    title: "Customer",
    description: "Who's renting?",
    icon: UserIcon,
    help: {
      title: "Pick the renter",
      body: (
        <>
          <p>
            Choose an existing customer from the list. If this is a brand-new
            customer, click <strong>Add Customer</strong> first to create their
            record, then come back to this booking.
          </p>
          <p className="mt-2">
            Customers with verified driver licenses get a green checkmark in
            the dropdown — you can rent to them right away. Unverified ones
            will need a pre-check-in before pickup.
          </p>
        </>
      ),
    },
  },
  {
    id: 2,
    title: "Vehicle",
    description: "Which car?",
    icon: Car,
    help: {
      title: "Pick the vehicle",
      body: (
        <>
          <p>
            Each vehicle in the dropdown shows its base daily rate. The
            system will automatically pick the best price tier (daily,
            weekend, weekly, monthly) once you set the dates in the next
            step.
          </p>
          <p className="mt-2">
            <strong>Heads up:</strong> The list shows every vehicle that
            isn&apos;t marked inactive — even ones currently rented. You can
            still book future dates that don&apos;t overlap.
          </p>
        </>
      ),
    },
  },
  {
    id: 3,
    title: "Dates",
    description: "Pickup & return",
    icon: CalendarRange,
    help: {
      title: "Set pickup and return",
      body: (
        <>
          <p>
            Use the date-time pickers. The return must be after the pickup —
            the system blocks anything shorter than the minimum rental
            period configured in Settings.
          </p>
          <p className="mt-2">
            Whole-day rentals = 24 hours from pickup. A pickup at 10 AM
            today + return at 10 AM tomorrow = 1 day. Anything over by an
            hour or more rounds up to the next day.
          </p>
        </>
      ),
    },
  },
  {
    id: 4,
    title: "Pricing",
    description: "Rate & discounts",
    icon: DollarSign,
    help: {
      title: "Adjust pricing if needed",
      body: (
        <>
          <p>
            Leave <strong>Rate Override</strong> blank to use the best
            automatic rate (the system picks daily/weekend/weekly/monthly
            for you). Only override if you negotiated a custom rate.
          </p>
          <p className="mt-2">
            Use <strong>Discount</strong> for one-off promo codes or
            goodwill. Always fill the <strong>Reason</strong> so the audit
            log explains why the rental was discounted.
          </p>
        </>
      ),
    },
  },
  {
    id: 5,
    title: "Review",
    description: "Confirm & create",
    icon: ClipboardCheck,
    help: {
      title: "One last look",
      body: (
        <>
          <p>
            <strong>Status</strong> defaults to Pending. Set it to{" "}
            <em>Confirmed</em> if the customer has already paid the deposit
            or you trust the booking. Use <em>Pending</em> when you&apos;re
            holding the vehicle but waiting on payment.
          </p>
          <p className="mt-2">
            <strong>Source</strong> tells you how the booking came in (Phone,
            Walk-in, Website, etc) — used for the marketing reports.
          </p>
          <p className="mt-2">
            <strong>Customer Notes</strong> appear on the customer-facing
            invoice + agreement. <strong>Internal Notes</strong> are
            staff-only and never sent out.
          </p>
        </>
      ),
    },
  },
];

export function ReservationWizard({
  action,
  customers,
  vehicles,
  taxRate,
}: {
  action: Action;
  customers: Customer[];
  vehicles: Vehicle[];
  taxRate: number;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  // Controlled state for every field so values survive across step nav
  // (we render only one step's UI at a time, so uncontrolled inputs would
  // lose state when unmounted).
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickup, setPickup] = useState("");
  const [ret, setRet] = useState("");
  const [rateType, setRateType] = useState("daily");
  const [rateOverride, setRateOverride] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [status, setStatus] = useState("pending");
  const [source, setSource] = useState("phone");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const preview = useMemo(() => {
    if (!selectedVehicle || !pickup || !ret) return null;
    if (new Date(ret) <= new Date(pickup)) return null;
    return computeReservationTotals({
      vehicle: selectedVehicle,
      pickupAt: pickup,
      returnAt: ret,
      discountAmount: Number(discount) || 0,
      taxRatePercent: taxRate,
      rateAmountOverride: rateOverride ? Number(rateOverride) : undefined,
    });
  }, [selectedVehicle, pickup, ret, discount, rateOverride, taxRate]);

  // Per-step "can I move on?" check. We don't block strictly — the server
  // re-validates — but warn before letting the operator advance with empty
  // required fields, to avoid wasted form submissions.
  function stepError(s: number): string | null {
    if (s === 1 && !customerId) return "Pick a customer to continue.";
    if (s === 2 && !vehicleId) return "Pick a vehicle to continue.";
    if (s === 3) {
      if (!pickup || !ret) return "Both pickup and return are required.";
      if (new Date(ret) <= new Date(pickup))
        return "Return must be after pickup.";
    }
    return null;
  }
  const currentStepError = stepError(step);

  function next() {
    if (currentStepError) return;
    setStep((s) => Math.min(STEPS.length, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }
  function jumpTo(target: number) {
    // Allow jumping backwards freely. Jumping forwards requires the
    // intermediate steps to be valid.
    if (target <= step) {
      setStep(target);
      return;
    }
    for (let s = step; s < target; s++) {
      if (stepError(s)) return;
    }
    setStep(target);
  }

  const currentHelp = STEPS[step - 1].help;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {state.error && <Alert tone="error">{state.error}</Alert>}

        {/* Progress bar — the 5 step pills */}
        <ProgressBar current={step} onJump={jumpTo} />

        {/* Current-step help panel */}
        <div className="rounded-xl border border-gold-200 bg-gold-50/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gold-900">
            <Sparkles className="h-4 w-4 text-gold-600" />
            {currentHelp.title}
          </p>
          <div className="mt-1.5 space-y-2 text-sm text-slate-700">
            {currentHelp.body}
          </div>
        </div>

        {/* STEP 1 — CUSTOMER */}
        <StepCard visible={step === 1} title="Who is renting?">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1">
              <Field
                label="Customer"
                required
                error={err("customer_id")}
                hint="Type to search by name or email"
              >
                <Select
                  name="customer_id"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} — {c.email}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Link
              href="/admin/customers/new"
              target="_blank"
              className="mb-[2px] inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </Link>
          </div>

          {selectedCustomer && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-800">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </p>
              <p className="mt-0.5 text-slate-600">{selectedCustomer.email}</p>
              <p className="text-slate-600">
                {selectedCustomer.phone || "No phone"}
              </p>
              {selectedCustomer.dl_number ? (
                <p className="mt-2 text-xs text-emerald-700">
                  DL #{selectedCustomer.dl_number} ({selectedCustomer.dl_state})
                  — on file
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-700">
                  No driver license on file. Customer must complete
                  pre-check-in before pickup.
                </p>
              )}
            </div>
          )}
        </StepCard>

        {/* STEP 2 — VEHICLE */}
        <StepCard visible={step === 2} title="Which vehicle are they renting?">
          <Field label="Vehicle" required error={err("vehicle_id")}>
            <Select
              name="vehicle_id"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} —{" "}
                  {formatCurrency(v.daily_rate)}/day
                </option>
              ))}
            </Select>
          </Field>

          {selectedVehicle && (
            <div className="mt-4 flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {selectedVehicle.main_image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedVehicle.main_image_url}
                  alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                  className="h-24 w-32 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-800">
                  {selectedVehicle.year} {selectedVehicle.make}{" "}
                  {selectedVehicle.model}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {selectedVehicle.license_plate || "No plate"} ·{" "}
                  {selectedVehicle.color}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Daily {formatCurrency(selectedVehicle.daily_rate)}
                  {selectedVehicle.weekly_rate
                    ? ` · Weekly ${formatCurrency(selectedVehicle.weekly_rate)}`
                    : ""}
                  {selectedVehicle.monthly_rate
                    ? ` · Monthly ${formatCurrency(selectedVehicle.monthly_rate)}`
                    : ""}
                </p>
              </div>
            </div>
          )}
        </StepCard>

        {/* STEP 3 — DATES */}
        <StepCard visible={step === 3} title="When?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Pickup Date & Time"
              required
              error={err("pickup_at")}
            >
              <Input
                name="pickup_at"
                type="datetime-local"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </Field>
            <Field
              label="Return Date & Time"
              required
              error={err("return_at")}
            >
              <Input
                name="return_at"
                type="datetime-local"
                value={ret}
                min={pickup}
                onChange={(e) => setRet(e.target.value)}
              />
            </Field>
          </div>
          {preview && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Check className="mr-1 inline h-4 w-4" />
              {preview.rentalDays} day(s) at the{" "}
              <strong>{preview.rateType}</strong> rate —{" "}
              {formatCurrency(preview.rentalSubtotal)} before tax.
            </div>
          )}
        </StepCard>

        {/* STEP 4 — PRICING */}
        <StepCard visible={step === 4} title="Pricing adjustments">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rate Type" error={err("rate_type")}>
              <Select
                name="rate_type"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekend">Weekend</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
            <Field
              label="Rate Override ($/day)"
              hint="Leave blank for automatic best rate"
              error={err("rate_amount")}
            >
              <Input
                name="rate_amount"
                type="number"
                step="0.01"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                placeholder="—"
              />
            </Field>
            <Field label="Discount ($)" error={err("discount_amount")}>
              <Input
                name="discount_amount"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field
              label="Discount Reason"
              hint="Shown in the audit log"
              error={err("discount_reason")}
            >
              <Input
                name="discount_reason"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. Loyal customer · Promo code WELCOME10"
              />
            </Field>
          </div>
        </StepCard>

        {/* STEP 5 — REVIEW + STATUS / SOURCE / NOTES */}
        <StepCard visible={step === 5} title="Confirm and create">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" required error={err("status")}>
              <Select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {Object.entries(RESERVATION_STATUS).map(([v, c]) => (
                  <option key={v} value={v}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source" required error={err("source")}>
              <Select
                name="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {Object.entries(RESERVATION_SOURCES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Customer Notes (shown on invoice)"
              className="sm:col-span-2"
              error={err("notes")}
            >
              <Textarea
                name="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the customer should know about this rental"
              />
            </Field>
            <Field
              label="Internal Staff Notes (staff only)"
              className="sm:col-span-2"
              error={err("internal_notes")}
            >
              <Textarea
                name="internal_notes"
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="e.g. Customer wants the keys left at the front desk"
              />
            </Field>
          </div>

          {/* Review summary */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Booking summary
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <ReviewRow
                label="Customer"
                value={
                  selectedCustomer
                    ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                    : "—"
                }
              />
              <ReviewRow
                label="Vehicle"
                value={
                  selectedVehicle
                    ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
                    : "—"
                }
              />
              <ReviewRow
                label="Pickup"
                value={pickup ? new Date(pickup).toLocaleString() : "—"}
              />
              <ReviewRow
                label="Return"
                value={ret ? new Date(ret).toLocaleString() : "—"}
              />
              <ReviewRow
                label="Total"
                value={preview ? formatCurrency(preview.total) : "—"}
              />
              <ReviewRow
                label="Status"
                value={
                  RESERVATION_STATUS[
                    status as keyof typeof RESERVATION_STATUS
                  ]?.label ?? status
                }
              />
            </dl>
          </div>
        </StepCard>

        {/* NAV BUTTONS + per-step error */}
        {currentStepError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {currentStepError}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button
              type="button"
              onClick={next}
              disabled={!!currentStepError}
            >
              Next: {STEPS[step].title} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" loading={pending}>
              <Save className="h-4 w-4" /> Create Reservation
            </Button>
          )}
        </div>
      </div>

      {/* SIDEBAR — live price summary, sticks on desktop */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Live Price Summary</CardTitle>
          </CardHeader>
          <CardBody>
            {preview ? (
              <dl className="space-y-2 text-sm">
                <Line
                  label={`Rental — ${preview.rentalDays} day(s) @ ${preview.rateType}`}
                  value={formatCurrency(preview.rentalSubtotal)}
                />
                {preview.discountAmount > 0 && (
                  <Line
                    label="Discount"
                    value={`- ${formatCurrency(preview.discountAmount)}`}
                  />
                )}
                <Line
                  label={`Tax (${taxRate}%)`}
                  value={formatCurrency(preview.taxAmount)}
                />
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(preview.total)}</span>
                </div>
                <Line
                  label="Security Deposit"
                  value={formatCurrency(preview.depositAmount)}
                  muted
                />
              </dl>
            ) : (
              <p className="flex items-start gap-2 text-sm text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                Pricing appears here once you&apos;ve picked a vehicle and
                dates.
              </p>
            )}

            <Link
              href="/admin/reservations"
              className="mt-5 block text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel & go back
            </Link>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}

// ---- subcomponents --------------------------------------------------------

function ProgressBar({
  current,
  onJump,
}: {
  current: number;
  onJump: (s: number) => void;
}) {
  return (
    <ol className="flex w-full items-center gap-1">
      {STEPS.map((s, idx) => {
        const isDone = s.id < current;
        const isCurrent = s.id === current;
        const StepIcon = s.icon;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => onJump(s.id)}
              className={`group flex flex-1 flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-slate-50 ${
                isCurrent ? "" : "cursor-pointer"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                  isCurrent
                    ? "border-gold-500 bg-gold-500 text-white"
                    : isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-slate-500"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </span>
              <span
                className={`text-center text-[11px] font-medium leading-tight ${
                  isCurrent
                    ? "text-gold-700"
                    : isDone
                      ? "text-emerald-700"
                      : "text-slate-500"
                }`}
              >
                {s.title}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <span
                className={`hidden h-0.5 flex-1 sm:block ${
                  s.id < current ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({
  visible,
  title,
  children,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
}) {
  // We keep every step's inputs in the DOM (just hidden) so values submit
  // with the form even when navigating between steps.
  return (
    <Card className={visible ? "" : "hidden"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${muted ? "text-slate-400" : "text-slate-600"}`}
    >
      <span>{label}</span>
      <span className={muted ? "" : "font-medium text-slate-800"}>{value}</span>
    </div>
  );
}
