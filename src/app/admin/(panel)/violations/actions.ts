"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { ViolationType, ViolationStatus } from "@/lib/types/database";

export async function createViolation(input: {
  vehicle_id: string;
  violation_type: ViolationType;
  description: string;
  location: string;
  amount: number;
  incurred_date: string;
  status: ViolationStatus;
  charged_to_customer: boolean;
  reference_number: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to record violations." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("toll_violations").insert({
    vehicle_id: input.vehicle_id || null,
    violation_type: input.violation_type,
    description: input.description.trim() || null,
    location: input.location.trim() || null,
    amount: input.amount,
    incurred_date: input.incurred_date || new Date().toISOString().slice(0, 10),
    status: input.status,
    charged_to_customer: input.charged_to_customer,
    reference_number: input.reference_number.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "violation.created",
    entityType: "vehicle",
    entityId: input.vehicle_id || undefined,
  });
  revalidatePath("/admin/violations");
  return { ok: true };
}

export async function setViolationStatus(
  id: string,
  status: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to update violations." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("toll_violations")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/violations");
  return { ok: true };
}
