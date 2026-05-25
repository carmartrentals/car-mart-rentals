"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle2,
  Clock,
  UserCheck,
  AlarmClock,
  Fuel,
  Truck,
  Mail,
  Bell,
  ShieldCheck,
  Globe,
  Receipt,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import {
  saveBusinessHours,
  saveDriverRequirements,
  saveLateReturnPolicy,
  saveFuelPolicy,
  saveDeliveryOptions,
  saveAutoEmailPreferences,
  saveOwnerNotifications,
  saveVerificationGates,
  saveSocialLinks,
  saveDisplaySettings,
  saveTollPassthrough,
} from "@/app/admin/(panel)/settings/actions";
import type {
  BusinessHours,
  DayKey,
  DriverRequirements,
  LateReturnPolicy,
  FuelPolicy,
  DeliveryOptions,
  AutoEmailPreferences,
  OwnerNotifications,
  VerificationGates,
  SocialLinks,
  TollPassthrough,
} from "@/lib/data/settings";

// Generic helper to reduce per-form boilerplate.
function useSaveHandler() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    okMsg = "Settings saved.",
  ) {
    setResult(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setResult({ ok: true, msg: okMsg });
        router.refresh();
      } else {
        setResult({
          ok: false,
          msg: res.error ?? "Could not save settings.",
        });
      }
    });
  }
  return { pending, result, run };
}

function ResultAlert({
  result,
}: {
  result: { ok: boolean; msg: string } | null;
}) {
  if (!result) return null;
  return (
    <Alert tone={result.ok ? "success" : "error"}>
      {result.ok && <CheckCircle2 className="mr-1.5 inline h-4 w-4" />}
      {result.msg}
    </Alert>
  );
}

// ============================================================================
// Business hours
// ============================================================================
const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function BusinessHoursForm({ initial }: { initial: BusinessHours }) {
  const [hours, setHours] = useState<BusinessHours>(initial);
  const { pending, result, run } = useSaveHandler();

  function setDay(d: DayKey, k: "open" | "close", v: string) {
    setHours((h) => ({ ...h, [d]: { ...h[d], [k]: v } }));
  }
  function toggleClosed(d: DayKey) {
    const isClosed = !hours[d].open && !hours[d].close;
    setHours((h) => ({
      ...h,
      [d]: isClosed
        ? { open: "09:00", close: "17:00" }
        : { open: "", close: "" },
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold-600" />
            Business Hours
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Used by the AI receptionist, contact page, and to gate out-of-hours
          bookings. Leave blank or click &quot;Closed&quot; to mark a day off.
        </p>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const day = hours[d.key];
            const closed = !day.open && !day.close;
            return (
              <div
                key={d.key}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-slate-700">
                  {d.label}
                </span>
                {closed ? (
                  <span className="flex-1 text-sm italic text-slate-400">
                    Closed
                  </span>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={day.open}
                      onChange={(e) => setDay(d.key, "open", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <Input
                      type="time"
                      value={day.close}
                      onChange={(e) => setDay(d.key, "close", e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleClosed(d.key)}
                  className="shrink-0 text-xs font-medium text-slate-500 underline hover:text-slate-700"
                >
                  {closed ? "Open" : "Mark closed"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveBusinessHours(hours))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Business Hours
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Driver requirements
// ============================================================================
export function DriverRequirementsForm({
  initial,
}: {
  initial: DriverRequirements;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-gold-600" />
            Driver Requirements
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Minimum years licensed"
            hint="Driver must have held a license at least this long."
          >
            <Input
              type="number"
              min="0"
              value={v.min_years_licensed}
              onChange={(e) =>
                setV({ ...v, min_years_licensed: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Young driver age threshold"
            hint="Drivers under this age pay the surcharge below."
          >
            <Input
              type="number"
              min="16"
              max="99"
              value={v.young_driver_age_threshold}
              onChange={(e) =>
                setV({ ...v, young_driver_age_threshold: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Young driver surcharge ($/day)"
            hint="Added to the daily rate for under-threshold drivers."
          >
            <Input
              type="number"
              min="0"
              value={v.young_driver_surcharge}
              onChange={(e) =>
                setV({ ...v, young_driver_surcharge: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={v.accept_international}
              onChange={(e) =>
                setV({ ...v, accept_international: e.target.checked })
              }
              className="h-4 w-4 accent-gold-500"
            />
            Accept international licenses
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={v.accept_permit}
              onChange={(e) => setV({ ...v, accept_permit: e.target.checked })}
              className="h-4 w-4 accent-gold-500"
            />
            Accept learner&apos;s permits (rarely recommended)
          </label>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveDriverRequirements(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Driver Requirements
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Late return policy
// ============================================================================
export function LateReturnPolicyForm({
  initial,
}: {
  initial: LateReturnPolicy;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-gold-600" />
            Late Return Policy
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Grace period (minutes)"
            hint="No fee inside this window."
          >
            <Input
              type="number"
              min="0"
              value={v.grace_minutes}
              onChange={(e) =>
                setV({ ...v, grace_minutes: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Hourly overtime rate ($)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={v.hourly_rate}
              onChange={(e) =>
                setV({ ...v, hourly_rate: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Full-day after (hours)"
            hint="Charge a full extra day instead of hourly."
          >
            <Input
              type="number"
              min="0"
              value={v.full_day_after_hours}
              onChange={(e) =>
                setV({ ...v, full_day_after_hours: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveLateReturnPolicy(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Late Return Policy
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Fuel policy
// ============================================================================
export function FuelPolicyForm({ initial }: { initial: FuelPolicy }) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gold-600" />
            Fuel Policy
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Applied at check-in when the vehicle is returned with less fuel than
          it left with.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Refuel service fee ($)"
            hint="Flat charge for returning the car not full."
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={v.refuel_service_fee}
              onChange={(e) =>
                setV({ ...v, refuel_service_fee: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Per-gallon markup ($)"
            hint="Added to actual gas price per gallon refueled."
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={v.per_gallon_markup}
              onChange={(e) =>
                setV({ ...v, per_gallon_markup: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveFuelPolicy(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Fuel Policy
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Delivery options
// ============================================================================
export function DeliveryOptionsForm({
  initial,
}: {
  initial: DeliveryOptions;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-gold-600" />
            Pickup &amp; Delivery
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={v.in_house_enabled}
              onChange={(e) =>
                setV({ ...v, in_house_enabled: e.target.checked })
              }
              className="h-4 w-4 accent-gold-500"
            />
            Offer in-house pickup at your location (always free)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={v.local_enabled}
              onChange={(e) => setV({ ...v, local_enabled: e.target.checked })}
              className="h-4 w-4 accent-gold-500"
            />
            Offer local delivery
          </label>
          {v.local_enabled && (
            <div className="ml-6 grid gap-4 sm:grid-cols-2">
              <Field label="Free up to (miles)">
                <Input
                  type="number"
                  min="0"
                  value={v.local_free_miles}
                  onChange={(e) =>
                    setV({ ...v, local_free_miles: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="$/mile beyond">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={v.local_per_mile_fee}
                  onChange={(e) =>
                    setV({ ...v, local_per_mile_fee: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={v.airport_enabled}
              onChange={(e) =>
                setV({ ...v, airport_enabled: e.target.checked })
              }
              className="h-4 w-4 accent-gold-500"
            />
            Offer airport delivery
          </label>
          {v.airport_enabled && (
            <div className="ml-6">
              <Field label="Airport delivery flat fee ($)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={v.airport_flat_fee}
                  onChange={(e) =>
                    setV({ ...v, airport_flat_fee: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveDeliveryOptions(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Delivery Options
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Auto-email preferences
// ============================================================================
export function AutoEmailPreferencesForm({
  initial,
}: {
  initial: AutoEmailPreferences;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold-600" />
            Auto-Email Preferences
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Automated customer emails sent on a schedule. Set to <strong>0</strong>{" "}
          to turn an email off entirely.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Pre-check-in invite (hours before pickup)"
            hint="0 = don't auto-send"
          >
            <Input
              type="number"
              min="0"
              value={v.precheckin_hours_before}
              onChange={(e) =>
                setV({ ...v, precheckin_hours_before: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Thanks + review (hours after return)"
            hint="0 = don't auto-send"
          >
            <Input
              type="number"
              min="0"
              value={v.thanks_hours_after_return}
              onChange={(e) =>
                setV({ ...v, thanks_hours_after_return: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Unpaid balance reminder (every N days)"
            hint="0 = don't auto-send"
          >
            <Input
              type="number"
              min="0"
              value={v.unpaid_reminder_days}
              onChange={(e) =>
                setV({ ...v, unpaid_reminder_days: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Insurance expiring nudge (within N days)"
            hint="0 = don't auto-send"
          >
            <Input
              type="number"
              min="0"
              value={v.insurance_expiry_nudge_days}
              onChange={(e) =>
                setV({ ...v, insurance_expiry_nudge_days: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveAutoEmailPreferences(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Auto-Emails
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Owner notifications
// ============================================================================
const NOTIFICATION_LABELS: { key: keyof OwnerNotifications; label: string }[] = [
  { key: "on_new_booking", label: "New booking arrives" },
  { key: "on_cancellation", label: "Customer cancels a reservation" },
  { key: "on_high_risk_booking", label: "AI flags a high-risk booking" },
  { key: "on_damage_detected", label: "AI damage detector finds new damage" },
  { key: "on_failed_payment", label: "A payment fails" },
  { key: "on_late_return", label: "A reservation goes past return time" },
  { key: "on_ai_call_completed", label: "AI receptionist finishes a call (noisy)" },
];

export function OwnerNotificationsForm({
  initial,
}: {
  initial: OwnerNotifications;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold-600" />
            Owner Notifications
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Pick which events email <strong>you</strong> (the owner). Customer
          emails are controlled separately above.
        </p>
        <ul className="space-y-2">
          {NOTIFICATION_LABELS.map(({ key, label }) => (
            <li key={key}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={v[key]}
                  onChange={(e) => setV({ ...v, [key]: e.target.checked })}
                  className="h-4 w-4 accent-gold-500"
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveOwnerNotifications(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Notification Triggers
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Verification gates
// ============================================================================
export function VerificationGatesForm({
  initial,
}: {
  initial: VerificationGates;
}) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Verification Levels
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          How strict the system is about verifying a renter before allowing
          check-out.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Driver license verification">
            <Select
              value={v.license_level}
              onChange={(e) =>
                setV({
                  ...v,
                  license_level: e.target.value as VerificationGates["license_level"],
                })
              }
            >
              <option value="ai">AI photo check only</option>
              <option value="ai_dmv">AI + manual DMV result required</option>
              <option value="stripe">Stripe Identity required</option>
            </Select>
          </Field>
          <Field label="Insurance verification">
            <Select
              value={v.insurance_level}
              onChange={(e) =>
                setV({
                  ...v,
                  insurance_level: e.target.value as VerificationGates["insurance_level"],
                })
              }
            >
              <option value="off">Not required</option>
              <option value="required">Upload required</option>
              <option value="ai_pass">Upload + AI score must pass</option>
            </Select>
          </Field>
          {v.insurance_level === "ai_pass" && (
            <Field
              label="Minimum AI insurance score (0-100)"
              hint="Lower scores get flagged for review."
            >
              <Input
                type="number"
                min="0"
                max="100"
                value={v.insurance_min_score}
                onChange={(e) =>
                  setV({ ...v, insurance_min_score: Number(e.target.value) })
                }
              />
            </Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={v.block_checkout_on_fail}
            onChange={(e) =>
              setV({ ...v, block_checkout_on_fail: e.target.checked })
            }
            className="h-4 w-4 accent-gold-500"
          />
          Block check-out when any gate fails (otherwise just warn)
        </label>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveVerificationGates(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Verification Levels
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Social media links
// ============================================================================
const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; ph: string }[] = [
  { key: "instagram", label: "Instagram", ph: "https://instagram.com/yourhandle" },
  { key: "facebook", label: "Facebook", ph: "https://facebook.com/yourpage" },
  { key: "tiktok", label: "TikTok", ph: "https://tiktok.com/@yourhandle" },
  { key: "yelp", label: "Yelp", ph: "https://yelp.com/biz/your-business" },
  {
    key: "google_reviews",
    label: "Google Reviews",
    ph: "https://g.page/your-business/review",
  },
  { key: "twitter", label: "Twitter / X", ph: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube", ph: "https://youtube.com/@yourchannel" },
];

export function SocialLinksForm({ initial }: { initial: SocialLinks }) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Globe className="h-4 w-4 text-gold-600" />
            Social Media Links
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Rendered in the website footer. Leave blank to hide a network.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <Input
                type="url"
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                placeholder={f.ph}
              />
            </Field>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveSocialLinks(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Social Links
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Display settings (timezone)
// ============================================================================
const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export function DisplaySettingsForm({ initial }: { initial: { timezone: string } }) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Globe className="h-4 w-4 text-gold-600" />
            Display Settings
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <Field
          label="Display timezone"
          hint="Used to format dates in admin, emails, and PDFs."
        >
          <Select
            value={v.timezone}
            onChange={(e) => setV({ timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveDisplaySettings(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Display
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Toll passthrough
// ============================================================================
export function TollPassthroughForm({ initial }: { initial: TollPassthrough }) {
  const [v, setV] = useState(initial);
  const { pending, result, run } = useSaveHandler();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gold-600" />
            Toll Passthrough Markup
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <ResultAlert result={result} />
        <p className="text-xs text-slate-500">
          Added on top of each toll passed through to the customer. Covers
          your admin time + processing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Flat markup per toll ($)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={v.flat_markup}
              onChange={(e) =>
                setV({ ...v, flat_markup: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Percent markup (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={v.percent_markup}
              onChange={(e) =>
                setV({ ...v, percent_markup: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => run(() => saveTollPassthrough(v))}
            loading={pending}
          >
            <Save className="h-4 w-4" /> Save Toll Markup
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
