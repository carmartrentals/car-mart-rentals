"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import {
  inspectLicensePhotos,
  aggregateLicenseRisk,
} from "@/lib/ai-license-check";
import type { ActionState } from "@/lib/form";
import type { Customer } from "@/lib/types/database";

/**
 * Run the AI license inspector against the customer's uploaded DL photos
 * and store the result. Recomputes the aggregate risk level.
 */
export async function runAiLicenseCheck(
  customerId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to run license checks." };
  }

  const admin = createAdminClient();
  const { data: cRow } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  const customer = cRow as Customer | null;
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!customer.dl_front_url) {
    return {
      ok: false,
      error: "No license photo uploaded. Ask the customer to upload one first.",
    };
  }

  const inspection = await inspectLicensePhotos({
    frontUrl: customer.dl_front_url,
    backUrl: customer.dl_back_url,
    expectedName: `${customer.first_name} ${customer.last_name}`,
    expectedDob: customer.date_of_birth,
    expectedLicenseNumber: customer.dl_number,
    expectedState: customer.dl_state,
  });
  if (!inspection) {
    return {
      ok: false,
      error: "AI inspection failed. Check OPENAI_API_KEY and try again.",
    };
  }

  const isExpired =
    !!customer.dl_expiration && new Date(customer.dl_expiration) < new Date();

  const risk = aggregateLicenseRisk({
    aiScore: inspection.score,
    aiFlags: inspection.flags,
    dmvStatus: customer.dl_dmv_check_status,
    isExpired,
  });

  // Auto-fill the printed license fields the AI extracted, but only when
  // the customer record's field is currently empty — never overwrite
  // operator-typed values.
  const extracted = inspection.extracted ?? {};
  const update: Record<string, string | number | string[] | null> = {
    dl_ai_check_at: new Date().toISOString(),
    dl_ai_check_score: inspection.score,
    dl_ai_check_flags: inspection.flags,
    dl_ai_check_summary: inspection.summary,
    license_risk_level: risk,
  };
  const filled: string[] = [];
  if (!customer.dl_number && extracted.licenseNumber) {
    update.dl_number = String(extracted.licenseNumber).trim();
    filled.push("license #");
  }
  if (!customer.dl_state && extracted.state) {
    update.dl_state = String(extracted.state).toUpperCase().slice(0, 2);
    filled.push("state");
  }
  if (
    !customer.dl_expiration &&
    extracted.expirationDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(extracted.expirationDate)
  ) {
    update.dl_expiration = extracted.expirationDate;
    filled.push("expiration");
  }
  if (
    !customer.date_of_birth &&
    extracted.dateOfBirth &&
    /^\d{4}-\d{2}-\d{2}$/.test(extracted.dateOfBirth)
  ) {
    update.date_of_birth = extracted.dateOfBirth;
    filled.push("date of birth");
  }

  await admin.from("customers").update(update).eq("id", customerId);

  await logActivity({
    userId: user.id,
    action: "customer.ai_license_check",
    entityType: "customer",
    entityId: customerId,
    description: `Score ${inspection.score} · risk ${risk}${
      inspection.flags.length ? " · flags: " + inspection.flags.join(", ") : ""
    }${filled.length ? " · auto-filled: " + filled.join(", ") : ""}`,
  });

  revalidatePath(`/admin/customers/${customerId}`);
  // Any reservation showing this customer's license fields needs to re-render
  // with the freshly extracted data.
  revalidatePath("/admin/reservations", "layout");
  return { ok: true };
}

/**
 * Manual DMV verification — set after staff looks up the license on the
 * state DMV portal. Provider-agnostic: when a real-time API is wired up,
 * it just sets provider='checkr' (or whatever) instead of 'manual'.
 */
export async function setDmvCheckResult(
  customerId: string,
  result: {
    status: "valid" | "suspended" | "revoked" | "expired" | "unknown";
    notes?: string;
    provider?: string;
  },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission." };
  }
  if (!["valid", "suspended", "revoked", "expired", "unknown"].includes(result.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const admin = createAdminClient();
  const { data: cRow } = await admin
    .from("customers")
    .select("dl_expiration, dl_ai_check_score, dl_ai_check_flags")
    .eq("id", customerId)
    .maybeSingle();
  const customer = cRow as Pick<
    Customer,
    "dl_expiration" | "dl_ai_check_score" | "dl_ai_check_flags"
  > | null;

  const isExpired =
    !!customer?.dl_expiration && new Date(customer.dl_expiration) < new Date();
  const risk = aggregateLicenseRisk({
    aiScore: customer?.dl_ai_check_score ?? null,
    aiFlags: customer?.dl_ai_check_flags ?? null,
    dmvStatus: result.status,
    isExpired,
  });

  const { error } = await admin
    .from("customers")
    .update({
      dl_dmv_check_at: new Date().toISOString(),
      dl_dmv_check_status: result.status,
      dl_dmv_check_provider: result.provider ?? "manual",
      dl_dmv_check_notes: result.notes ?? null,
      license_risk_level: risk,
    })
    .eq("id", customerId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "customer.dmv_check",
    entityType: "customer",
    entityId: customerId,
    description: `${result.provider ?? "manual"}: ${result.status}${
      result.notes ? " — " + result.notes : ""
    }`,
  });

  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}
