import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { Alert } from "@/components/ui/misc";
import type { EmailTemplate } from "@/lib/types/database";

export default async function EmailTemplatesPage() {
  let templates: EmailTemplate[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_templates")
      .select("*")
      .order("name");
    templates = (data as EmailTemplate[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Email Templates"
        subtitle="Edit the wording of automated customer emails."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load email templates. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <EmailTemplateEditor templates={templates} />
    </>
  );
}
