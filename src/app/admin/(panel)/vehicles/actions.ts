"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { zodErrorState, fd, nullable, type ActionState } from "@/lib/form";

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readVehicleForm(form: FormData) {
  return {
    year: fd(form, "year"),
    make: fd(form, "make"),
    model: fd(form, "model"),
    trim: fd(form, "trim"),
    vin: fd(form, "vin"),
    license_plate: fd(form, "license_plate"),
    color: fd(form, "color"),
    category: fd(form, "category"),
    seats: fd(form, "seats"),
    doors: fd(form, "doors"),
    fuel_type: fd(form, "fuel_type"),
    transmission: fd(form, "transmission"),
    odometer: fd(form, "odometer") || "0",
    daily_rate: fd(form, "daily_rate") || "0",
    weekly_rate: fd(form, "weekly_rate") || undefined,
    monthly_rate: fd(form, "monthly_rate") || undefined,
    weekend_rate: fd(form, "weekend_rate") || undefined,
    security_deposit: fd(form, "security_deposit") || "0",
    mileage_limit: fd(form, "mileage_limit") || "0",
    extra_mileage_fee: fd(form, "extra_mileage_fee") || "0",
    cleaning_fee: fd(form, "cleaning_fee") || "0",
    late_fee: fd(form, "late_fee") || "0",
    smoking_fee: fd(form, "smoking_fee") || "0",
    fuel_policy: fd(form, "fuel_policy") || "Return with same fuel level",
    status: fd(form, "status"),
    main_image_url: fd(form, "main_image_url"),
    description: fd(form, "description"),
    internal_notes: fd(form, "internal_notes"),
    registration_expiration: fd(form, "registration_expiration"),
    insurance_expiration: fd(form, "insurance_expiration"),
    gps_device_id: fd(form, "gps_device_id"),
    is_featured: form.get("is_featured") === "on",
  };
}

async function uniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base || "vehicle";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await admin
      .from("vehicles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === excludeId) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function createVehicle(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to add vehicles." };
  }

  const raw = readVehicleForm(form);
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return zodErrorState(parsed.error);
  const v = parsed.data;

  const admin = createAdminClient();
  const slug = await uniqueSlug(
    admin,
    slugify(`${v.year}-${v.make}-${v.model}-${v.trim ?? ""}`),
  );

  const { data: created, error } = await admin
    .from("vehicles")
    .insert({
      slug,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: nullable(v.trim ?? ""),
      vin: nullable(v.vin ?? ""),
      license_plate: nullable(v.license_plate ?? ""),
      color: nullable(v.color ?? ""),
      category: v.category,
      seats: v.seats,
      doors: v.doors,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      odometer: v.odometer,
      daily_rate: v.daily_rate,
      weekly_rate: v.weekly_rate ?? null,
      monthly_rate: v.monthly_rate ?? null,
      weekend_rate: v.weekend_rate ?? null,
      security_deposit: v.security_deposit,
      mileage_limit: v.mileage_limit,
      extra_mileage_fee: v.extra_mileage_fee,
      cleaning_fee: v.cleaning_fee,
      late_fee: v.late_fee,
      smoking_fee: v.smoking_fee,
      fuel_policy: v.fuel_policy,
      status: v.status,
      main_image_url: nullable(v.main_image_url ?? ""),
      description: nullable(v.description ?? ""),
      internal_notes: nullable(v.internal_notes ?? ""),
      registration_expiration: nullable(v.registration_expiration ?? ""),
      insurance_expiration: nullable(v.insurance_expiration ?? ""),
      gps_device_id: nullable(v.gps_device_id ?? ""),
      is_featured: v.is_featured ?? false,
      features: parseList(fd(form, "features")),
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not create vehicle." };
  }

  // Gallery images
  const gallery = parseList(fd(form, "gallery_urls"));
  const images = [
    ...(v.main_image_url
      ? [{ vehicle_id: created.id, url: v.main_image_url, is_primary: true, sort_order: 0 }]
      : []),
    ...gallery.map((url, i) => ({
      vehicle_id: created.id,
      url,
      is_primary: false,
      sort_order: i + 1,
    })),
  ];
  if (images.length) await admin.from("vehicle_images").insert(images);

  await logActivity({
    userId: user.id,
    action: "vehicle.created",
    entityType: "vehicle",
    entityId: created.id,
    description: `Added vehicle ${v.year} ${v.make} ${v.model}`,
  });

  revalidatePath("/admin/vehicles");
  redirect(`/admin/vehicles/${created.id}`);
}

export async function updateVehicle(
  vehicleId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to edit vehicles." };
  }

  const raw = readVehicleForm(form);
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return zodErrorState(parsed.error);
  const v = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .update({
      year: v.year,
      make: v.make,
      model: v.model,
      trim: nullable(v.trim ?? ""),
      vin: nullable(v.vin ?? ""),
      license_plate: nullable(v.license_plate ?? ""),
      color: nullable(v.color ?? ""),
      category: v.category,
      seats: v.seats,
      doors: v.doors,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      odometer: v.odometer,
      daily_rate: v.daily_rate,
      weekly_rate: v.weekly_rate ?? null,
      monthly_rate: v.monthly_rate ?? null,
      weekend_rate: v.weekend_rate ?? null,
      security_deposit: v.security_deposit,
      mileage_limit: v.mileage_limit,
      extra_mileage_fee: v.extra_mileage_fee,
      cleaning_fee: v.cleaning_fee,
      late_fee: v.late_fee,
      smoking_fee: v.smoking_fee,
      fuel_policy: v.fuel_policy,
      status: v.status,
      main_image_url: nullable(v.main_image_url ?? ""),
      description: nullable(v.description ?? ""),
      internal_notes: nullable(v.internal_notes ?? ""),
      registration_expiration: nullable(v.registration_expiration ?? ""),
      insurance_expiration: nullable(v.insurance_expiration ?? ""),
      gps_device_id: nullable(v.gps_device_id ?? ""),
      is_featured: v.is_featured ?? false,
      features: parseList(fd(form, "features")),
    })
    .eq("id", vehicleId);

  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "vehicle.updated",
    entityType: "vehicle",
    entityId: vehicleId,
    description: `Updated vehicle ${v.year} ${v.make} ${v.model}`,
  });

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) return;

  const admin = createAdminClient();
  // Block deletion when active/upcoming reservations exist.
  const { count } = await admin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", ["pending", "confirmed", "active", "overdue"]);

  if ((count ?? 0) > 0) {
    // Soft-deactivate instead of deleting.
    await admin
      .from("vehicles")
      .update({ status: "inactive" })
      .eq("id", vehicleId);
  } else {
    await admin.from("vehicles").delete().eq("id", vehicleId);
  }

  await logActivity({
    userId: user.id,
    action: "vehicle.deleted",
    entityType: "vehicle",
    entityId: vehicleId,
  });

  revalidatePath("/admin/vehicles");
  redirect("/admin/vehicles");
}
