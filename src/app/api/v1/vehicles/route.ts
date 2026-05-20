import { createAdminClient } from "@/lib/supabase/admin";
import { apiJson, apiError, parsePaging } from "@/lib/api";

/**
 * GET /api/v1/vehicles
 * Public fleet listing. Query: category, fuel_type, status, q, page, limit.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { limit, page, from, to } = parsePaging(url);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  let query = admin
    .from("vehicles")
    .select("*, vehicle_images(*)", { count: "exact" })
    .neq("status", "inactive");

  const category = url.searchParams.get("category");
  const fuel = url.searchParams.get("fuel_type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  if (category) query = query.eq("category", category);
  if (fuel) query = query.eq("fuel_type", fuel);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`make.ilike.%${q}%,model.ilike.%${q}%`);

  const { data, count, error } = await query
    .order("is_featured", { ascending: false })
    .order("daily_rate")
    .range(from, to);

  if (error) return apiError(error.message, 500);

  return apiJson({
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0 },
  });
}
