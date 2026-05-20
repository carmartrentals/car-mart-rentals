import { createAdminClient } from "@/lib/supabase/admin";
import { apiJson, apiError } from "@/lib/api";

/**
 * GET /api/v1/availability?vehicle_id=&start=&end=
 *
 * With a date range: returns { available: boolean } for the vehicle.
 * Without a range: returns the vehicle's upcoming booked date ranges.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicle_id");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!vehicleId) return apiError("vehicle_id is required", 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      return apiError("Invalid start/end dates", 422);
    }
    const { data, error } = await admin.rpc("is_vehicle_available", {
      p_vehicle_id: vehicleId,
      p_start: s.toISOString(),
      p_end: e.toISOString(),
    });
    if (error) return apiError(error.message, 500);
    return apiJson({ vehicle_id: vehicleId, available: data === true });
  }

  // Return upcoming booked ranges.
  const { data, error } = await admin
    .from("reservations")
    .select("id, reservation_number, pickup_at, return_at, status")
    .eq("vehicle_id", vehicleId)
    .in("status", ["pending", "confirmed", "active", "overdue"])
    .gte("return_at", new Date().toISOString())
    .order("pickup_at");

  if (error) return apiError(error.message, 500);
  return apiJson({ vehicle_id: vehicleId, booked: data ?? [] });
}
