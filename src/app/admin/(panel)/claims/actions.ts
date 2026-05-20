"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { ClaimStatus } from "@/lib/types/database";

export async function saveClaim(input: {
  id?: string;
  claim_number: string;
  customer_id: string;
  insurance_company: string;
  adjuster_name: string;
  adjuster_email: string;
  adjuster_phone: string;
  status: ClaimStatus;
  authorized_amount: number;
  deductible: number;
  claim_date: string;
  notes: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to manage claims." };
  }
  if (!input.claim_number.trim()) {
    return { ok: false, error: "Enter a claim number." };
  }

  const admin = createAdminClient();
  const payload = {
    claim_number: input.claim_number.trim(),
    customer_id: input.customer_id || null,
    insurance_company: input.insurance_company.trim() || null,
    adjuster_name: input.adjuster_name.trim() || null,
    adjuster_email: input.adjuster_email.trim() || null,
    adjuster_phone: input.adjuster_phone.trim() || null,
    status: input.status,
    authorized_amount: input.authorized_amount,
    deductible: input.deductible,
    claim_date: input.claim_date || null,
    notes: input.notes.trim() || null,
  };
  const { error } = input.id
    ? await admin.from("insurance_claims").update(payload).eq("id", input.id)
    : await admin.from("insurance_claims").insert(payload);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: input.id ? "claim.updated" : "claim.created",
    entityType: "insurance_claim",
    entityId: input.id,
    description: `Claim ${input.claim_number}`,
  });
  revalidatePath("/admin/claims");
  return { ok: true };
}
