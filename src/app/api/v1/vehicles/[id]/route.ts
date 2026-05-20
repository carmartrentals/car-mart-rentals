import { createAdminClient } from "@/lib/supabase/admin";
import { apiJson, apiError } from "@/lib/api";

/** GET /api/v1/vehicles/:id — single vehicle by id or slug. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data, error } = await admin
    .from("vehicles")
    .select("*, vehicle_images(*)")
    .eq(isUuid ? "id" : "slug", id)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Vehicle not found", 404);

  return apiJson({ data });
}
