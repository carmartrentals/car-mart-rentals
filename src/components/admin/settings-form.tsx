"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveGeneralSettings } from "@/app/admin/(panel)/settings/actions";

interface CompanyValue {
  name: string; legal_name: string; email: string;
  phone: string; website: string; address: string; logo_url: string;
}
interface TaxValue {
  rate: number; label: string; enabled: boolean;
}
interface BookingValue {
  min_rental_days: number; max_rental_days: number;
  min_driver_age: number; buffer_hours: number;
}

export function SettingsForm({
  company,
  tax,
  bookingRules,
}: {
  company: CompanyValue;
  tax: TaxValue;
  bookingRules: BookingValue;
}) {
  const router = useRouter();
  const [co, setCo] = useState(company);
  const [tx, setTx] = useState(tax);
  const [bk, setBk] = useState(bookingRules);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveGeneralSettings({
        company: co,
        tax: { ...tx, rate: Number(tx.rate) || 0 },
        bookingRules: {
          min_rental_days: Number(bk.min_rental_days) || 1,
          max_rental_days: Number(bk.max_rental_days) || 90,
          min_driver_age: Number(bk.min_driver_age) || 21,
          buffer_hours: Number(bk.buffer_hours) || 0,
        },
      });
      if (res.ok) {
        setResult({ ok: true, msg: "Settings saved successfully." });
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Could not save settings." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {result && (
        <Alert tone={result.ok ? "success" : "error"}>{result.msg}</Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Name">
            <Input value={co.name}
              onChange={(e) => setCo({ ...co, name: e.target.value })} />
          </Field>
          <Field label="Legal Name">
            <Input value={co.legal_name}
              onChange={(e) => setCo({ ...co, legal_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={co.email}
              onChange={(e) => setCo({ ...co, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={co.phone}
              onChange={(e) => setCo({ ...co, phone: e.target.value })} />
          </Field>
          <Field label="Website">
            <Input value={co.website}
              onChange={(e) => setCo({ ...co, website: e.target.value })} />
          </Field>
          <Field label="Logo URL">
            <Input value={co.logo_url}
              onChange={(e) => setCo({ ...co, logo_url: e.target.value })} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={co.address}
              onChange={(e) => setCo({ ...co, address: e.target.value })} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tax</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax Label">
            <Input value={tx.label}
              onChange={(e) => setTx({ ...tx, label: e.target.value })} />
          </Field>
          <Field label="Rate (%)" hint="Applied to taxable charges">
            <Input type="number" step="0.01" value={String(tx.rate)}
              onChange={(e) => setTx({ ...tx, rate: Number(e.target.value) })} />
          </Field>
          <Field label="Enabled">
            <Select value={tx.enabled ? "yes" : "no"}
              onChange={(e) => setTx({ ...tx, enabled: e.target.value === "yes" })}>
              <option value="yes">Tax enabled</option>
              <option value="no">Tax disabled</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Min Rental Days">
            <Input type="number" value={String(bk.min_rental_days)}
              onChange={(e) => setBk({ ...bk, min_rental_days: Number(e.target.value) })} />
          </Field>
          <Field label="Max Rental Days">
            <Input type="number" value={String(bk.max_rental_days)}
              onChange={(e) => setBk({ ...bk, max_rental_days: Number(e.target.value) })} />
          </Field>
          <Field label="Min Driver Age">
            <Input type="number" value={String(bk.min_driver_age)}
              onChange={(e) => setBk({ ...bk, min_driver_age: Number(e.target.value) })} />
          </Field>
          <Field label="Buffer Hours" hint="Gap between rentals">
            <Input type="number" value={String(bk.buffer_hours)}
              onChange={(e) => setBk({ ...bk, buffer_hours: Number(e.target.value) })} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {result?.ok && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={save} loading={pending}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
