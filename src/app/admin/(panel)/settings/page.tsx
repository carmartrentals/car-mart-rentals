import { PageHeader } from "@/components/admin/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { getSetting } from "@/lib/data/settings";
import { COMPANY } from "@/lib/constants";

export default async function SettingsPage() {
  const company = await getSetting("company_profile", {
    name: COMPANY.name,
    email: COMPANY.email,
    phone: COMPANY.phone,
    address: COMPANY.address,
  });
  const tax = await getSetting<{ rate: number; label: string; enabled: boolean }>(
    "tax",
    { rate: 0, label: "Sales Tax", enabled: false },
  );
  const rules = await getSetting<Record<string, number>>("booking_rules", {});

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Company profile, taxes, booking rules and user management."
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="Name" value={String(company.name ?? "—")} />
            <Row label="Email" value={String(company.email ?? "—")} />
            <Row label="Phone" value={String(company.phone ?? "—")} />
            <Row label="Address" value={String(company.address ?? "—")} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tax</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="Label" value={tax.label} />
            <Row label="Rate" value={`${tax.rate}%`} />
            <Row label="Enabled" value={tax.enabled ? "Yes" : "No"} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="Min rental days" value={String(rules.min_rental_days ?? "—")} />
            <Row label="Max rental days" value={String(rules.max_rental_days ?? "—")} />
            <Row label="Min driver age" value={String(rules.min_driver_age ?? "—")} />
            <Row label="Buffer hours" value={String(rules.buffer_hours ?? "—")} />
          </CardBody>
        </Card>
      </div>

      <ModulePlaceholder
        phase="Phase 3"
        features={[
          "Editable company profile and branding",
          "Tax, fees and add-on configuration",
          "Business hours and locations",
          "Booking rules, age and deposit policies",
          "Cancellation policy",
          "User management and role permissions",
          "Editable rental agreement and email templates",
        ]}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
