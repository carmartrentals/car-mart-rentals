"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { initialActionState, type ActionState } from "@/lib/form";
import type { Customer } from "@/lib/types/database";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function CustomerForm({
  action,
  customer,
}: {
  action: Action;
  customer?: Customer;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const isEdit = !!customer;
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="First Name" required error={err("first_name")}>
            <Input name="first_name" defaultValue={customer?.first_name} />
          </Field>
          <Field label="Last Name" required error={err("last_name")}>
            <Input name="last_name" defaultValue={customer?.last_name} />
          </Field>
          <Field label="Date of Birth" error={err("date_of_birth")}>
            <Input name="date_of_birth" type="date" defaultValue={customer?.date_of_birth ?? ""} />
          </Field>
          <Field label="Email" required error={err("email")}>
            <Input name="email" type="email" defaultValue={customer?.email} />
          </Field>
          <Field label="Phone" error={err("phone")}>
            <Input name="phone" type="tel" defaultValue={customer?.phone ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Address</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Street Address" className="lg:col-span-2" error={err("address")}>
            <Input name="address" defaultValue={customer?.address ?? ""} />
          </Field>
          <Field label="City" error={err("city")}>
            <Input name="city" defaultValue={customer?.city ?? ""} />
          </Field>
          <Field label="State" error={err("state")}>
            <Input name="state" defaultValue={customer?.state ?? ""} />
          </Field>
          <Field label="ZIP" error={err("zip")}>
            <Input name="zip" defaultValue={customer?.zip ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Driver License</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="License Number" error={err("dl_number")}>
            <Input name="dl_number" defaultValue={customer?.dl_number ?? ""} />
          </Field>
          <Field label="License State" error={err("dl_state")}>
            <Input name="dl_state" defaultValue={customer?.dl_state ?? ""} />
          </Field>
          <Field label="License Expiration" error={err("dl_expiration")}>
            <Input name="dl_expiration" type="date" defaultValue={customer?.dl_expiration ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Insurance / Claim (if applicable)</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Insurance Company" error={err("insurance_company")}>
            <Input name="insurance_company" defaultValue={customer?.insurance_company ?? ""} />
          </Field>
          <Field label="Policy Number" error={err("insurance_policy_no")}>
            <Input name="insurance_policy_no" defaultValue={customer?.insurance_policy_no ?? ""} />
          </Field>
          <Field label="Claim Number" error={err("claim_number")}>
            <Input name="claim_number" defaultValue={customer?.claim_number ?? ""} />
          </Field>
          <Field label="Adjuster Name" error={err("adjuster_name")}>
            <Input name="adjuster_name" defaultValue={customer?.adjuster_name ?? ""} />
          </Field>
          <Field label="Adjuster Email" error={err("adjuster_email")}>
            <Input name="adjuster_email" type="email" defaultValue={customer?.adjuster_email ?? ""} />
          </Field>
          <Field label="Adjuster Phone" error={err("adjuster_phone")}>
            <Input name="adjuster_phone" type="tel" defaultValue={customer?.adjuster_phone ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Flags & Notes</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <Checkbox name="is_vip" label="VIP Customer" defaultChecked={customer?.is_vip} />
            <Checkbox name="documents_verified" label="Documents Verified"
              defaultChecked={customer?.documents_verified} />
            <Checkbox name="is_blacklisted" label="Blacklisted"
              defaultChecked={customer?.is_blacklisted} />
          </div>
          <Field label="Internal Notes" error={err("notes")}>
            <Textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={isEdit ? `/admin/customers/${customer!.id}` : "/admin/customers"}>
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit" loading={pending}>
          <Save className="h-4 w-4" />
          {isEdit ? "Save Changes" : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}

function Checkbox({
  name, label, defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}
