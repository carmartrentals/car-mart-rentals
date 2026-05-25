"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import {
  inspectInsurancePhoto,
  aggregateInsuranceRisk,
} from "@/lib/ai-insurance-check";
import type { ActionState } from "@/lib/form";
import type { Customer } from "@/lib/types/database";

/**
 * Run the AI insurance inspector against the customer's uploaded
 * proof-of-insurance document and store the result. Recomputes the
 * aggregate insurance risk level and auto-fills the printed insurance
 * fields when those record fields are currently empty.
 */
export async function runAiInsuranceCheck(
  customerId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return {
      ok: false,
      error: "You do not have permission to run insurance checks.",
    };
  }

  const admin = createAdminClient();
  const { data: cRow } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  const customer = cRow as Customer | null;
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!customer.insurance_doc_url) {
    return {
      ok: false,
      error:
        "No insurance document uploaded. Ask the customer to upload one first.",
    };
  }

  const inspection = await inspectInsurancePhoto({
    documentUrl: customer.insurance_doc_url,
    expectedName: `${customer.first_name} ${customer.last_name}`,
  });
  if (!inspection) {
    return {
      ok: false,
      error:
        "AI inspection failed. PDFs aren't supported — ask for a photo (JPG/PNG) of the insurance card. Also check OPENAI_API_KEY.",
    };
  }

  const isExpired =
    !!customer.insurance_expiration &&
    new Date(customer.insurance_expiration) < new Date();

  const risk = aggregateInsuranceRisk({
    aiScore: inspection.score,
    aiFlags: inspection.flags,
    isExpired,
  });

  // Auto-fill the printed insurance fields the AI extracted, but only when
  // the customer record's field is currently empty — never overwrite
  // operator-typed values.
  const extracted = inspection.extracted ?? {};
  const update: Record<string, string | number | string[] | null> = {
    insurance_ai_check_at: new Date().toISOString(),
    insurance_ai_check_score: inspection.score,
    insurance_ai_check_flags: inspection.flags,
    insurance_ai_check_summary: inspection.summary,
    insurance_risk_level: risk,
  };
  const filled: string[] = [];
  if (!customer.insurance_company && extracted.company) {
    update.insurance_company = String(extracted.company).trim();
    filled.push("company");
  }
  if (!customer.insurance_policy_no && extracted.policyNumber) {
    update.insurance_policy_no = String(extracted.policyNumber).trim();
    filled.push("policy #");
  }
  if (
    !customer.insurance_expiration &&
    extracted.expirationDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(extracted.expirationDate)
  ) {
    update.insurance_expiration = extracted.expirationDate;
    filled.push("expiration");
  }

  await admin.from("customers").update(update).eq("id", customerId);

  await logActivity({
    userId: user.id,
    action: "customer.ai_insurance_check",
    entityType: "customer",
    entityId: customerId,
    description: `Score ${inspection.score} · risk ${risk}${
      inspection.flags.length
        ? " · flags: " + inspection.flags.join(", ")
        : ""
    }${filled.length ? " · auto-filled: " + filled.join(", ") : ""}`,
  });

  revalidatePath(`/admin/customers/${customerId}`);
  // Any reservation showing this customer's insurance fields needs to
  // re-render with the freshly extracted data.
  revalidatePath("/admin/reservations", "layout");
  return { ok: true };
}
