import { PageHeader } from "@/components/admin/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSetting,
  getAiVoiceSettings,
  getCancellationPolicy,
} from "@/lib/data/settings";
import { COMPANY } from "@/lib/constants";
import { SettingsForm } from "@/components/admin/settings-form";
import { AiVoiceSettingsForm } from "@/components/admin/ai-voice-settings-form";
import { CancellationPolicyForm } from "@/components/admin/cancellation-policy-form";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { AgreementEditor } from "@/components/admin/agreement-editor";
import { Alert } from "@/components/ui/misc";
import type { AddOn, Fee, AgreementTemplate } from "@/lib/types/database";

export default async function SettingsPage() {
  const company = await getSetting<Record<string, unknown>>("company_profile", {});
  const tax = await getSetting<Record<string, unknown>>("tax", {});
  const rules = await getSetting<Record<string, unknown>>("booking_rules", {});
  const voice = await getAiVoiceSettings();
  const cancellation = await getCancellationPolicy();

  const companyValue = {
    name: String(company.name ?? COMPANY.name),
    legal_name: String(company.legal_name ?? ""),
    email: String(company.email ?? COMPANY.email),
    phone: String(company.phone ?? COMPANY.phone),
    website: String(company.website ?? ""),
    address: String(company.address ?? COMPANY.address),
    logo_url: String(company.logo_url ?? ""),
  };
  const taxValue = {
    rate: Number(tax.rate ?? 0),
    label: String(tax.label ?? "Sales Tax"),
    enabled: Boolean(tax.enabled ?? false),
  };
  const bookingValue = {
    min_rental_days: Number(rules.min_rental_days ?? 1),
    max_rental_days: Number(rules.max_rental_days ?? 90),
    min_driver_age: Number(rules.min_driver_age ?? 21),
    buffer_hours: Number(rules.buffer_hours ?? 2),
  };

  let addOns: AddOn[] = [];
  let fees: Fee[] = [];
  let template: AgreementTemplate | null = null;
  let configError = false;

  try {
    const admin = createAdminClient();
    const [aRes, fRes, tRes] = await Promise.all([
      admin.from("add_ons").select("*").order("sort_order"),
      admin.from("fees").select("*").order("name"),
      admin
        .from("agreement_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle(),
    ]);
    addOns = (aRes.data as AddOn[]) ?? [];
    fees = (fRes.data as Fee[]) ?? [];
    template = (tRes.data as AgreementTemplate | null) ?? null;
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Company profile, taxes, catalog and rental agreement."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load all settings. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <div className="space-y-6">
        <SettingsForm
          company={companyValue}
          tax={taxValue}
          bookingRules={bookingValue}
        />
        <AiVoiceSettingsForm initial={voice} />
        <CancellationPolicyForm initial={cancellation} />
        <CatalogManager addOns={addOns} fees={fees} />
        <AgreementEditor
          templateId={template?.id ?? null}
          templateName={template?.name ?? "Standard Rental Agreement"}
          initialSections={template?.sections ?? []}
        />
      </div>
    </>
  );
}
