"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { AgreementSection } from "@/lib/types/database";

/**
 * Saves the rental agreement template sections. New agreements created at
 * check-out snapshot these sections, so existing agreements are unaffected.
 */
export async function saveAgreementTemplate(
  templateId: string | null,
  name: string,
  sections: AgreementSection[],
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can edit the agreement template." };
  }

  const clean = sections
    .map((s) => ({ title: s.title.trim(), body: s.body.trim() }))
    .filter((s) => s.title || s.body);
  if (clean.length === 0) {
    return { ok: false, error: "Add at least one agreement section." };
  }

  const admin = createAdminClient();
  if (templateId) {
    const { error } = await admin
      .from("agreement_templates")
      .update({ name: name.trim() || "Standard Rental Agreement", sections: clean })
      .eq("id", templateId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("agreement_templates").insert({
      name: name.trim() || "Standard Rental Agreement",
      sections: clean,
      is_default: true,
      is_active: true,
    });
    if (error) return { ok: false, error: error.message };
  }

  await logActivity({
    userId: user.id,
    action: "agreement_template.updated",
    entityType: "agreement_template",
    entityId: templateId ?? undefined,
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
