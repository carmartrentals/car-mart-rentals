"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";

export async function saveReview(input: {
  id?: string;
  reviewer_name: string;
  rating: number;
  title: string;
  comment: string;
  vehicle_id: string;
  is_published: boolean;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to manage reviews." };
  }
  if (!input.reviewer_name.trim()) {
    return { ok: false, error: "Enter the reviewer's name." };
  }
  if (input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Rating must be between 1 and 5." };
  }

  const admin = createAdminClient();
  const payload = {
    reviewer_name: input.reviewer_name.trim(),
    rating: input.rating,
    title: input.title.trim() || null,
    comment: input.comment.trim() || null,
    vehicle_id: input.vehicle_id || null,
    is_published: input.is_published,
  };
  const { error } = input.id
    ? await admin.from("reviews").update(payload).eq("id", input.id)
    : await admin.from("reviews").insert(payload);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: input.id ? "review.updated" : "review.created",
    entityType: "review",
    entityId: input.id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleReviewPublished(
  id: string,
  published: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to manage reviews." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("reviews")
    .update({ is_published: published })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { ok: true };
}
