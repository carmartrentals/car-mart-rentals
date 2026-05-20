"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Gauge, Camera, AlertTriangle, PenLine, CheckCircle2,
  Plus, Trash2, Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { SignaturePad } from "@/components/admin/signature-pad";
import { formatCurrency } from "@/lib/utils";
import { submitCheckout, submitCheckin } from "@/app/admin/(panel)/check/actions";
import type { DamageSeverity } from "@/lib/types/database";

interface DamageRow {
  location: string;
  description: string;
  severity: DamageSeverity;
}

export interface CheckWorkflowProps {
  mode: "checkout" | "checkin";
  reservationId: string;
  reservationNumber: string;
  customerName: string;
  vehicleName: string;
  vehicleLabel: string;
  licenseInfo?: string;
  rentalDays: number;
  mileageLimitPerDay: number;
  extraMileageFee: number;
  baselineOdometer?: number;
}

export function CheckWorkflow(props: CheckWorkflowProps) {
  const router = useRouter();
  const isCheckout = props.mode === "checkout";

  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState(75);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [extClean, setExtClean] = useState(true);
  const [intClean, setIntClean] = useState(true);
  const [extPhotos, setExtPhotos] = useState<string[]>([]);
  const [intPhotos, setIntPhotos] = useState<string[]>([]);
  const [damages, setDamages] = useState<DamageRow[]>([]);
  const [custSig, setCustSig] = useState<string | null>(null);
  const [staffSig, setStaffSig] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Check-in only
  const [lateFee, setLateFee] = useState("0");
  const [fuelFee, setFuelFee] = useState("0");
  const [cleaningFee, setCleaningFee] = useState("0");
  const [smokingFee, setSmokingFee] = useState("0");
  const [damageFee, setDamageFee] = useState("0");
  const [sendToMaintenance, setSendToMaintenance] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Live mileage calculation for check-in
  const mileage = useMemo(() => {
    if (isCheckout) return null;
    const odo = Number(odometer);
    const base = props.baselineOdometer ?? 0;
    if (!Number.isFinite(odo) || odo < base) return null;
    const driven = odo - base;
    const allowance =
      props.mileageLimitPerDay > 0
        ? props.mileageLimitPerDay * props.rentalDays
        : Infinity;
    const extra = allowance === Infinity ? 0 : Math.max(0, driven - allowance);
    return {
      driven,
      allowance,
      extra,
      charge: Math.round(extra * props.extraMileageFee * 100) / 100,
    };
  }, [isCheckout, odometer, props]);

  const extrasTotal = useMemo(() => {
    if (isCheckout) return 0;
    const fees = [lateFee, fuelFee, cleaningFee, smokingFee, damageFee]
      .map((v) => Number(v) || 0)
      .reduce((a, b) => a + b, 0);
    return Math.round((fees + (mileage?.charge ?? 0)) * 100) / 100;
  }, [isCheckout, lateFee, fuelFee, cleaningFee, smokingFee, damageFee, mileage]);

  function addDamage() {
    setDamages((d) => [...d, { location: "", description: "", severity: "minor" }]);
  }
  function updateDamage(i: number, patch: Partial<DamageRow>) {
    setDamages((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeDamage(i: number) {
    setDamages((d) => d.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    setError(null);
    const odo = Number(odometer);
    if (!Number.isFinite(odo) || odo <= 0) {
      setError("Enter a valid odometer reading.");
      return;
    }
    const photos = [
      ...extPhotos.map((url) => ({ url, category: "exterior" })),
      ...intPhotos.map((url) => ({ url, category: "interior" })),
    ];
    const cleanDamages = damages.filter((d) => d.location.trim());

    startTransition(async () => {
      const result = isCheckout
        ? await submitCheckout(props.reservationId, {
            odometer: odo,
            fuelLevel: fuel,
            licenseVerified,
            insuranceVerified,
            exteriorClean: extClean,
            interiorClean: intClean,
            photos,
            damages: cleanDamages,
            customerSignatureUrl: custSig,
            staffSignatureUrl: staffSig,
            notes,
          })
        : await submitCheckin(props.reservationId, {
            odometer: odo,
            fuelLevel: fuel,
            exteriorClean: extClean,
            interiorClean: intClean,
            photos,
            damages: cleanDamages,
            lateFee: Number(lateFee) || 0,
            fuelFee: Number(fuelFee) || 0,
            cleaningFee: Number(cleaningFee) || 0,
            smokingFee: Number(smokingFee) || 0,
            damageFee: Number(damageFee) || 0,
            customerSignatureUrl: custSig,
            staffSignatureUrl: staffSig,
            notes,
            sendToMaintenance,
          });

      if (result.ok) {
        router.push(`/admin/reservations/${props.reservationId}`);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Document verification — check-out only */}
      {isCheckout && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold-600" /> Document Verification
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {props.licenseInfo && (
              <p className="text-sm text-slate-500">{props.licenseInfo}</p>
            )}
            <CheckRow
              checked={licenseVerified}
              onChange={setLicenseVerified}
              label="Driver license verified — valid, not expired, photo matches"
            />
            <CheckRow
              checked={insuranceVerified}
              onChange={setInsuranceVerified}
              label="Insurance verified — valid coverage or protection purchased"
            />
          </CardBody>
        </Card>
      )}

      {/* Vehicle condition */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gold-600" />
              {isCheckout ? "Vehicle Condition at Pickup" : "Vehicle Condition at Return"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isCheckout ? "Odometer (mi)" : "Return Odometer (mi)"} required>
              <Input
                type="number"
                inputMode="numeric"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="e.g. 24500"
              />
            </Field>
            <Field label={`Fuel / Battery Level — ${fuel}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={fuel}
                onChange={(e) => setFuel(Number(e.target.value))}
                className="mt-3 w-full accent-gold-500"
              />
            </Field>
          </div>

          {!isCheckout && props.baselineOdometer != null && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">
                Check-out reading:{" "}
                <span className="font-medium text-slate-700">
                  {props.baselineOdometer.toLocaleString()} mi
                </span>
              </p>
              {mileage && (
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                  <span className="text-slate-600">
                    Driven: <strong>{mileage.driven.toLocaleString()} mi</strong>
                  </span>
                  <span className="text-slate-600">
                    Allowance:{" "}
                    <strong>
                      {mileage.allowance === Infinity
                        ? "Unlimited"
                        : `${mileage.allowance.toLocaleString()} mi`}
                    </strong>
                  </span>
                  <span className={mileage.extra > 0 ? "text-rose-600" : "text-emerald-600"}>
                    Excess: <strong>{mileage.extra.toLocaleString()} mi</strong>
                    {mileage.extra > 0 && ` → ${formatCurrency(mileage.charge)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-5">
            <CheckRow checked={extClean} onChange={setExtClean} label="Exterior clean" inline />
            <CheckRow checked={intClean} onChange={setIntClean} label="Interior clean" inline />
          </div>
        </CardBody>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gold-600" /> Inspection Photos
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <PhotoUpload
            label="Exterior photos (front, rear, both sides, roof)"
            bucket="inspections"
            folder={`${props.reservationId}/${props.mode}/exterior`}
            urls={extPhotos}
            onChange={setExtPhotos}
          />
          <PhotoUpload
            label="Interior photos (dash, seats, cargo)"
            bucket="inspections"
            folder={`${props.reservationId}/${props.mode}/interior`}
            urls={intPhotos}
            onChange={setIntPhotos}
          />
        </CardBody>
      </Card>

      {/* Damage */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gold-600" />
              {isCheckout ? "Existing Damage" : "New / Return Damage"}
            </span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addDamage} type="button">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {damages.length === 0 ? (
            <p className="text-sm text-slate-400">
              No damage recorded. Use “Add” to log any dents, scratches or issues.
            </p>
          ) : (
            damages.map((d, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_140px_auto]"
              >
                <Input
                  placeholder="Location (e.g. front bumper)"
                  value={d.location}
                  onChange={(e) => updateDamage(i, { location: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={d.description}
                  onChange={(e) => updateDamage(i, { description: e.target.value })}
                />
                <Select
                  value={d.severity}
                  onChange={(e) =>
                    updateDamage(i, { severity: e.target.value as DamageSeverity })
                  }
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                </Select>
                <button
                  type="button"
                  onClick={() => removeDamage(i)}
                  className="flex items-center justify-center rounded-md px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove damage"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Additional charges — check-in only */}
      {!isCheckout && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Charges</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeeField label="Late Return Fee" value={lateFee} onChange={setLateFee} />
              <FeeField label="Fuel / Charging Fee" value={fuelFee} onChange={setFuelFee} />
              <FeeField label="Cleaning Fee" value={cleaningFee} onChange={setCleaningFee} />
              <FeeField label="Smoking Fee" value={smokingFee} onChange={setSmokingFee} />
              <FeeField label="Damage Charge" value={damageFee} onChange={setDamageFee} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white">
              <span className="text-sm">
                Excess mileage {formatCurrency(mileage?.charge ?? 0)} + fees
              </span>
              <span className="text-lg font-bold text-gold-400">
                + {formatCurrency(extrasTotal)}
              </span>
            </div>
            <CheckRow
              checked={sendToMaintenance}
              onChange={setSendToMaintenance}
              label="Send vehicle to maintenance instead of making it available"
            />
          </CardBody>
        </Card>
      )}

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-gold-600" /> Signatures
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="grid gap-6 sm:grid-cols-2">
          <SignaturePad
            label="Customer Signature"
            folder={`${props.reservationId}/${props.mode}`}
            url={custSig}
            onChange={setCustSig}
          />
          <SignaturePad
            label="Staff Signature"
            folder={`${props.reservationId}/${props.mode}`}
            url={staffSig}
            onChange={setStaffSig}
          />
        </CardBody>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Inspection Notes</CardTitle></CardHeader>
        <CardBody>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations, customer remarks or special conditions..."
          />
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center justify-end gap-3 pb-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          loading={pending}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isCheckout ? "Complete Check-out" : "Complete Check-in"}
        </Button>
      </div>
    </div>
  );
}

// --- small helpers ----------------------------------------------------------
function CheckRow({
  checked, onChange, label, inline,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  inline?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 ${inline ? "" : "rounded-lg border border-slate-200 p-3"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function FeeField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          $
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7"
        />
      </div>
    </Field>
  );
}
