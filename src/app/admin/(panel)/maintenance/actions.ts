"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { MaintenanceType, MaintenanceStatus } from "@/lib/types/database";

interface MaintenanceInput {
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  service_date: string;
  due_date: string;
  due_mileage: string;
  cost: string;
  vendor: string;
  notes: string;
}

export async function createMaintenanceRecord(
  input: MaintenanceInput,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to add maintenance records." };
  }
  if (!input.vehicle_id) return { ok: false, error: "Select a vehicle." };
  if (!input.description.trim()) return { ok: false, error: "Enter a description." };

  const admin = createAdminClient();
  const { error } = await admin.from("maintenance_records").insert({
    vehicle_id: input.vehicle_id,
    maintenance_type: input.maintenance_type,
    description: input.description.trim(),
    status: input.status,
    service_date: input.service_date || null,
    due_date: input.due_date || null,
    due_mileage: input.due_mileage ? Number(input.due_mileage) : null,
    cost: input.cost ? Number(input.cost) : 0,
    vendor: input.vendor.trim() || null,
    notes: input.notes.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  // Move the vehicle into maintenance status when work is in progress.
  if (input.status === "in_progress") {
    await admin
      .from("vehicles")
      .update({ status: "maintenance" })
      .eq("id", input.vehicle_id);
  }

  await logActivity({
    userId: user.id,
    action: "maintenance.created",
    entityType: "vehicle",
    entityId: input.vehicle_id,
    description: `Logged ${input.maintenance_type} maintenance`,
  });

  revalidatePath("/admin/maintenance");
  return { ok: true };
}

/** Quick status change for a maintenance record. */
export async function setMaintenanceStatus(
  recordId: string,
  status: MaintenanceStatus,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to update maintenance." };
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") {
    patch.downtime_end = new Date().toISOString().slice(0, 10);
  }
  const { data: rec } = await admin
    .from("maintenance_records")
    .update(patch)
    .eq("id", recordId)
    .select("vehicle_id")
    .single();

  // Return the vehicle to service when maintenance completes.
  if (status === "completed" && rec?.vehicle_id) {
    await admin
      .from("vehicles")
      .update({ status: "available" })
      .eq("id", rec.vehicle_id);
  }

  revalidatePath("/admin/maintenance");
  return { ok: true };
}
