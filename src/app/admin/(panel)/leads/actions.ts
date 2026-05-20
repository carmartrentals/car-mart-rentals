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
