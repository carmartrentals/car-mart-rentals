"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { DamageSeverity, RepairStatus } from "@/lib/types/database";

interface DamageInput {
  vehicle_id: string;
  location: string;
  description: string;
  severity: DamageSeverity;
  repair_status: RepairStatus;
  estimated_cost: string;
  charged_to_customer: boolean;
  charge_amount: string;
}

export async function createDamage(input: DamageInput): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to log damage." };
  }
  if (!input.vehicle_id) return { ok: false, error: "Select a vehicle." };
  if (!input.location.trim()) return { ok: false, error: "Enter the damage location." };

  const admin = createAdminClient();
  const { error } = await admin.from("damages").insert({
    vehicle_id: input.vehicle_id,
    location: input.location.trim(),
    description: input.description.trim() || null,
    severity: input.severity,
    repair_status: input.repair_status,
    estimated_cost: input.estimated_cost ? Number(input.estimated_cost) : 0,
    charged_to_customer: input.charged_to_customer,
    charge_amount: input.charge_amount ? Number(input.charge_amount) : 0,
    reported_date: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "damage.created",
    entityType: "vehicle",
    entityId: input.vehicle_id,
    description: `Logged ${input.severity} damage — ${input.location}`,
  });

  revalidatePath("/admin/damages");
  return { ok: true };
}

/** Quick repair-status change for a damage record. */
export async function setRepairStatus(
  damageId: string,
  status: RepairStatus,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to update damage records." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("damages")
    .update({ repair_status: status })
    .eq("id", damageId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/damages");
  return { ok: true };
}
