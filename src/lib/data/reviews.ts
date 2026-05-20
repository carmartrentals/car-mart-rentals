import { createAdminClient } from "@/lib/supabase/admin";
import type { Review } from "@/lib/types/database";

export interface ReviewSummary {
  reviews: Review[];
  count: number;
  average: number; // 0 when there are no reviews
}

/** Published customer reviews, newest first. Returns [] on any failure. */
export async function getPublishedReviews(limit?: number): Promise<Review[]> {
  try {
    const admin = createAdminClient();
    let query = admin
      .from("reviews")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data } = await query;
    return (data as Review[]) ?? [];
  } catch {
    return [];
  }
}

/** Published reviews plus an aggregate count and average rating. */
export async function getReviewSummary(limit?: number): Promise<ReviewSummary> {
  const all = await getPublishedReviews();
  const count = all.length;
  const average =
    count > 0 ? all.reduce((s, r) => s + r.rating, 0) / count : 0;
  return {
    reviews: limit ? all.slice(0, limit) : all,
    count,
    average,
  };
}
