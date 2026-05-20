"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { BlockType } from "@/lib/types/database";

export async function saveBlock(input: {
  vehicle_id: string;
  start_at: string;
  end_at: string;
  block_type: BlockType;
  reason: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to block vehicles." };
  }
  if (!input.vehicle_id) {
    return { ok: false, error: "Select a vehicle to block." };
  }
  if (!input.start_at || !input.end_at) {
    return { ok: false, error: "Enter a start and end date." };
  }
  const start = new Date(input.start_at);
  const end = new Date(input.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Enter valid dates." };
  }
  if (end <= start) {
    return { ok: false, error: "The end date must be after the start date." };
  }

  const admin = createAdminClient();

  // Don't allow a block that overlaps an existing reservation.
  const { data: clashes } = await admin
    .from("reservations")
    .select("reservation_number")
    .eq("vehicle_id", input.vehicle_id)
    .in("status", ["confirmed", "active", "overdue", "pending"])
    .lt("pickup_at", end.toISOString())
    .gt("return_at", start.toISOString())
    .limit(1);
  if (clashes && clashes.length > 0) {
    return {
      ok: false,
      error: `This vehicle already has reservation ${clashes[0].reservation_number} in that window.`,
    };
  }

  const { error } = await admin.from("vehicle_blocks").insert({
    vehicle_id: input.vehicle_id,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    block_type: input.block_type,
    reason: input.reason.trim() || null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle_block.created",
    entityType: "vehicle_block",
    entityId: input.vehicle_id,
    description: `Blocked vehicle (${input.block_type})`,
  });
  revalidatePath("/admin/calendar");
  return { ok: true };
}

export async function deleteBlock(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "reservations")) {
    return { ok: false, error: "You do not have permission to remove blocks." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("vehicle_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle_block.deleted",
    entityType: "vehicle_block",
    entityId: id,
  });
  revalidatePath("/admin/calendar");
  return { ok: true };
}
