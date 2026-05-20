"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";

export async function saveLocation(input: {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  is_active: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can manage locations." };
  }
  if (!input.name.trim()) return { ok: false, error: "Enter a location name." };

  const admin = createAdminClient();
  const payload = {
    name: input.name.trim(),
    address: input.address.trim() || null,
    city: input.city.trim() || null,
    state: input.state.trim() || null,
    zip: input.zip.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    is_active: input.is_active,
  };
  const { error } = input.id
    ? await admin.from("locations").update(payload).eq("id", input.id)
    : await admin.from("locations").insert(payload);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: input.id ? "location.updated" : "location.created",
    entityType: "location",
    entityId: input.id,
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function toggleLocation(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can manage locations." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("locations")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/locations");
  return { ok: true };
}
