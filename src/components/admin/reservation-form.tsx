"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { initialActionState, type ActionState } from "@/lib/form";
import { computeReservationTotals } from "@/lib/pricing";
import { formatCurrency, toDateTimeLocal } from "@/lib/utils";
import { RESERVATION_STATUS, RESERVATION_SOURCES } from "@/lib/constants";
import type { Customer, Vehicle, Reservation } from "@/lib/types/database";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function ReservationForm({
  action,
  customers,
  vehicles,
  taxRate,
  reservation,
}: {
  action: Action;
  customers: Customer[];
  vehicles: Vehicle[];
  taxRate: number;
  reservation?: Reservation;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const isEdit = !!reservation;
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  const [vehicleId, setVehicleId] = useState(reservation?.vehicle_id ?? "");
  const [pickup, setPickup] = useState(
    reservation ? toDateTimeLocal(reservation.pickup_at) : "",
  );
  const [ret, setRet] = useState(
    reservation ? toDateTimeLocal(reservation.return_at) : "",
  );
  const [rateOverride, setRateOverride] = useState(
    reservation?.rate_amount ? String(reservation.rate_amount) : "",
  );
  const [discount, setDiscount] = useState(
    reservation?.discount_amount ? String(reservation.discount_amount) : "",
  );

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

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Card>
          <CardHeader><CardTitle>Customer & Vehicle</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" required error={err("customer_id")}>
              <Select name="customer_id" defaultValue={reservation?.customer_id ?? ""}>
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} — {c.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle" required error={err("vehicle_id")}>
              <Select
                name="vehicle_id"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} — {formatCurrency(v.daily_rate)}/day
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rental Period</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Pickup Date & Time" required error={err("pickup_at")}>
              <Input
                name="pickup_at"
                type="datetime-local"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </Field>
            <Field label="Return Date & Time" required error={err("return_at")}>
              <Input
                name="return_at"
                type="datetime-local"
                value={ret}
                min={pickup}
                onChange={(e) => setRet(e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Rate Type" error={err("rate_type")}>
              <Select name="rate_type" defaultValue={reservation?.rate_type ?? "daily"}>
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
              />
            </Field>
            <Field label="Discount ($)" error={err("discount_amount")}>
              <Input
                name="discount_amount"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
            <Field label="Discount Reason" error={err("discount_reason")}>
              <Input name="discount_reason" defaultValue={reservation?.discount_reason ?? ""} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status & Source</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" required error={err("status")}>
              <Select name="status" defaultValue={reservation?.status ?? "pending"}>
                {Object.entries(RESERVATION_STATUS).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Source" required error={err("source")}>
              <Select name="source" defaultValue={reservation?.source ?? "phone"}>
                {Object.entries(RESERVATION_SOURCES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Customer Notes" className="sm:col-span-2" error={err("notes")}>
              <Textarea name="notes" rows={2} defaultValue={reservation?.notes ?? ""} />
            </Field>
            <Field label="Internal Staff Notes" className="sm:col-span-2" error={err("internal_notes")}>
              <Textarea name="internal_notes" rows={2} defaultValue={reservation?.internal_notes ?? ""} />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/* SUMMARY */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Price Summary</CardTitle></CardHeader>
          <CardBody>
            {preview ? (
              <dl className="space-y-2 text-sm">
                <Line label={`Rental — ${preview.rentalDays} day(s) @ ${preview.rateType}`}
                  value={formatCurrency(preview.rentalSubtotal)} />
                {preview.discountAmount > 0 && (
                  <Line label="Discount" value={`- ${formatCurrency(preview.discountAmount)}`} />
                )}
                <Line label={`Tax (${taxRate}%)`} value={formatCurrency(preview.taxAmount)} />
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(preview.total)}</span>
                </div>
                <Line label="Security Deposit" value={formatCurrency(preview.depositAmount)} muted />
              </dl>
            ) : (
              <p className="text-sm text-slate-400">
                Select a vehicle and rental dates to see pricing.
              </p>
            )}

            <Button type="submit" loading={pending} className="mt-5 w-full">
              <Save className="h-4 w-4" />
              {isEdit ? "Save Changes" : "Create Reservation"}
            </Button>
            <Link
              href={isEdit ? `/admin/reservations/${reservation!.id}` : "/admin/reservations"}
              className="mt-2 block text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Link>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}

function Line({
  label, value, muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className={muted ? "" : "font-medium text-slate-800"}>{value}</span>
    </div>
  );
}
