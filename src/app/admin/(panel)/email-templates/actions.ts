"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";

export async function saveEmailTemplate(input: {
  id: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can edit email templates." };
  }
  if (!input.subject.trim()) return { ok: false, error: "Enter a subject line." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_templates")
    .update({
      subject: input.subject.trim(),
      body_html: input.body_html,
      is_active: input.is_active,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "email_template.updated",
    entityType: "email_template",
    entityId: input.id,
  });
  revalidatePath("/admin/email-templates");
  return { ok: true };
}
