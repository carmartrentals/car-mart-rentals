"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { VehicleDocType } from "@/lib/types/database";

/**
 * Saves a vehicle document record. The file itself is uploaded separately via
 * /api/admin/upload — this action only stores the metadata + resulting URL.
 */
export async function saveVehicleDocument(input: {
  vehicleId: string;
  docType: VehicleDocType;
  name: string;
  fileUrl: string;
  filePath: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return {
      ok: false,
      error: "You do not have permission to manage vehicle documents.",
    };
  }
  if (!input.vehicleId) return { ok: false, error: "Missing vehicle." };
  if (!input.name.trim()) return { ok: false, error: "Enter a document name." };
  if (!input.fileUrl) return { ok: false, error: "Upload a file first." };

  const admin = createAdminClient();
  const { error } = await admin.from("vehicle_documents").insert({
    vehicle_id: input.vehicleId,
    doc_type: input.docType,
    name: input.name.trim(),
    file_url: input.fileUrl,
    file_path: input.filePath || null,
    issue_date: input.issueDate || null,
    expiry_date: input.expiryDate || null,
    notes: input.notes.trim() || null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle_document.added",
    entityType: "vehicle",
    entityId: input.vehicleId,
    description: `Added document: ${input.name.trim()}`,
  });
  revalidatePath(`/admin/vehicles/${input.vehicleId}`);
  return { ok: true };
}

export async function deleteVehicleDocument(
  id: string,
  vehicleId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return {
      ok: false,
      error: "You do not have permission to manage vehicle documents.",
    };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("vehicle_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle_document.deleted",
    entityType: "vehicle",
    entityId: vehicleId,
  });
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { ok: true };
}
