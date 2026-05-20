import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiJson, apiError, authorizeApi, parsePaging } from "@/lib/api";
import { computeReservationTotals } from "@/lib/pricing";
import { getTaxRate } from "@/lib/data/settings";
import type { Vehicle } from "@/lib/types/database";

/**
 * GET /api/v1/reservations — authenticated.
 * Query: status, customer_id, vehicle_id, page, limit.
 */
export async function GET(request: Request) {
  const principal = await authorizeApi(request);
  if (!principal) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const { limit, page, from, to } = parsePaging(url);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  let query = admin
    .from("reservations")
    .select("*, customer:customers(*), vehicle:vehicles(*)", { count: "exact" });

  const status = url.searchParams.get("status");
  const customerId = url.searchParams.get("customer_id");
  const vehicleId = url.searchParams.get("vehicle_id");
  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return apiError(error.message, 500);
  return apiJson({
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0 },
  });
}

const createSchema = z.object({
  customer_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  pickup_at: z.string().datetime(),
  return_at: z.string().datetime(),
  status: z
    .enum(["quote", "pending", "confirmed"])
    .default("pending"),
  source: z
    .enum(["website", "phone", "walk_in", "insurance", "body_shop", "turo", "other"])
    .default("other"),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

/** POST /api/v1/reservations — authenticated. Creates a reservation. */
export async function POST(request: Request) {
  const principal = await authorizeApi(request);
  if (!principal) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }
  const input = parsed.data;

  if (new Date(input.return_at) <= new Date(input.pickup_at)) {
    return apiError("return_at must be after pickup_at", 422);
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  const { data: vehicleRow } = await admin
    .from("vehicles")
    .select("*")
    .eq("id", input.vehicle_id)
    .maybeSingle();
  if (!vehicleRow) return apiError("Vehicle not found", 404);
  const vehicle = vehicleRow as Vehicle;

  if (input.status !== "quote") {
    const { data: available } = await admin.rpc("is_vehicle_available", {
      p_vehicle_id: input.vehicle_id,
      p_start: input.pickup_at,
      p_end: input.return_at,
    });
    if (available === false) {
      return apiError("Vehicle is not available for the selected dates", 409);
    }
  }

  const taxRate = await getTaxRate();
  const pricing = computeReservationTotals({
    vehicle,
    pickupAt: input.pickup_at,
    returnAt: input.return_at,
    discountAmount: input.discount_amount ?? 0,
    taxRatePercent: taxRate,
  });

  const { data: created, error } = await admin
    .from("reservations")
    .insert({
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id,
      pickup_at: input.pickup_at,
      return_at: input.return_at,
      rate_type: pricing.rateType,
      rate_amount: pricing.rateAmount,
      rental_days: pricing.rentalDays,
      discount_amount: pricing.discountAmount,
      subtotal: pricing.subtotal,
      tax_amount: pricing.taxAmount,
      total: pricing.total,
      deposit_amount: pricing.depositAmount,
      balance_due: pricing.total,
      status: input.status,
      source: input.source,
      notes: input.notes ?? null,
      created_by: principal.userId ?? null,
    })
    .select("*")
    .single();

  if (error || !created) {
    return apiError(error?.message ?? "Could not create reservation", 500);
  }

  return apiJson({ data: created }, 201);
}
