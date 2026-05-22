"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { LeadSource, LeadStatus } from "@/lib/types/database";

export async function createLead(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  interested_vehicle_id: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to add leads." };
  }
  if (!input.name.trim()) return { ok: false, error: "Enter the lead's name." };

  const admin = createAdminClient();
  const { error } = await admin.from("leads").insert({
    name: input.name.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    message: input.message.trim() || null,
    source: input.source,
    status: input.status,
    interested_vehicle_id: input.interested_vehicle_id || null,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "lead.created",
    entityType: "lead",
    description: `Added lead ${input.name}`,
  });
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function setLeadStatus(
  id: string,
  status: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to update leads." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("leads").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Convert a lead into an insurance claim — used to accept an
 * insurance-replacement intake and move it onto the Insurance Claims page.
 */
export async function convertLeadToClaim(
  leadId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return {
      ok: false,
      error: "You do not have permission to create insurance claims.",
    };
  }

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("id, name, email, message, status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found." };

  // Parse the structured intake message ("Label: value" lines).
  const fields: Record<string, string> = {};
  for (const line of String(lead.message ?? "").split("\n")) {
    const idx = line.indexOf(": ");
    if (idx > 0) {
      fields[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
    }
  }

  const claimNumber = fields["Claim #"] || "PENDING";
  const { data: claim, error } = await admin
    .from("insurance_claims")
    .insert({
      claim_number: claimNumber,
      insurance_company: fields["Insurance company"] || null,
      adjuster_name: fields["Adjuster"] || null,
      status: "open",
      notes:
        `Created from lead: ${lead.name}` +
        (lead.email ? ` (${lead.email})` : "") +
        (lead.message ? `\n\n${lead.message}` : ""),
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  await admin.from("leads").update({ status: "converted" }).eq("id", leadId);

  await logActivity({
    userId: user.id,
    action: "lead.converted_to_claim",
    entityType: "insurance_claim",
    entityId: claim?.id,
    description: `Converted lead ${lead.name} to claim ${claimNumber}`,
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/claims");
  return { ok: true };
}
