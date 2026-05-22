import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Vehicle,
  VehicleWithImages,
  VehicleCategory,
  FuelType,
} from "@/lib/types/database";

/** A date range during which a vehicle is unavailable. */
export interface BookedRange {
  start: string;
  end: string;
}

/**
 * Upcoming date ranges when a vehicle is unavailable — from live
 * reservations and from manual calendar blocks. Used to show real-time
 * availability on the public vehicle page.
 */
export async function getVehicleBookedRanges(
  vehicleId: string,
): Promise<BookedRange[]> {
  try {
    const admin = createAdminClient();
    const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const [resv, blocks] = await Promise.all([
      admin
        .from("reservations")
        .select("pickup_at, return_at")
        .eq("vehicle_id", vehicleId)
        .in("status", ["pending", "confirmed", "active", "overdue"])
        .gte("return_at", todayIso),
      admin
        .from("vehicle_blocks")
        .select("start_at, end_at")
        .eq("vehicle_id", vehicleId)
        .gte("end_at", todayIso),
    ]);
    const ranges: BookedRange[] = [];
    for (const r of resv.data ?? []) {
      ranges.push({ start: r.pickup_at, end: r.return_at });
    }
    for (const b of blocks.data ?? []) {
      ranges.push({ start: b.start_at, end: b.end_at });
    }
    return ranges;
  } catch {
    return [];
  }
}

export interface VehicleFilters {
  category?: VehicleCategory;
  fuelType?: FuelType;
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest";
}

/** Public fleet listing for the website. RLS hides inactive vehicles. */
export async function getPublicVehicles(
  filters: VehicleFilters = {},
): Promise<VehicleWithImages[]> {
  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select("*, vehicle_images(*)")
    .neq("status", "inactive");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.fuelType) query = query.eq("fuel_type", filters.fuelType);
  if (filters.seats) query = query.gte("seats", filters.seats);
  if (filters.minPrice) query = query.gte("daily_rate", filters.minPrice);
  if (filters.maxPrice) query = query.lte("daily_rate", filters.maxPrice);
  if (filters.search) {
    query = query.or(
      `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`,
    );
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("daily_rate", { ascending: true });
      break;
    case "price_desc":
      query = query.order("daily_rate", { ascending: false });
      break;
    case "newest":
      query = query.order("year", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("daily_rate");
  }

  const { data, error } = await query;
  if (error) {
    console.error("getPublicVehicles:", error.message);
    return [];
  }
  return (data as VehicleWithImages[]) ?? [];
}

/** Featured vehicles for the home page. */
export async function getFeaturedVehicles(
  limit = 6,
): Promise<VehicleWithImages[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_images(*)")
    .eq("is_featured", true)
    .neq("status", "inactive")
    .order("daily_rate", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeaturedVehicles:", error.message);
    return [];
  }
  return (data as VehicleWithImages[]) ?? [];
}

/** Single vehicle by URL slug (website detail page). */
export async function getVehicleBySlug(
  slug: string,
): Promise<VehicleWithImages | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_images(*)")
    .eq("slug", slug)
    .neq("status", "inactive")
    .maybeSingle();

  if (error) {
    console.error("getVehicleBySlug:", error.message);
    return null;
  }
  return (data as VehicleWithImages) ?? null;
}

/** Similar vehicles in the same category. */
export async function getSimilarVehicles(
  vehicle: Vehicle,
  limit = 3,
): Promise<VehicleWithImages[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*, vehicle_images(*)")
    .eq("category", vehicle.category)
    .neq("id", vehicle.id)
    .neq("status", "inactive")
    .limit(limit);
  return (data as VehicleWithImages[]) ?? [];
}
