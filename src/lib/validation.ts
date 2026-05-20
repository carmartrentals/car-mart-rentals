import { z } from "zod";

// --- Vehicle ----------------------------------------------------------------
export const vehicleSchema = z.object({
  year: z.coerce.number().int().min(1980).max(2100),
  make: z.string().min(1, "Make is required").max(60),
  model: z.string().min(1, "Model is required").max(60),
  trim: z.string().max(60).optional().or(z.literal("")),
  vin: z.string().max(20).optional().or(z.literal("")),
  license_plate: z.string().max(15).optional().or(z.literal("")),
  color: z.string().max(40).optional().or(z.literal("")),
  category: z.enum(["luxury", "suv", "sedan", "sports", "electric", "economy"]),
  seats: z.coerce.number().int().min(1).max(15),
  doors: z.coerce.number().int().min(1).max(6),
  fuel_type: z.enum(["gasoline", "hybrid", "electric", "diesel"]),
  transmission: z.enum(["automatic", "manual"]),
  odometer: z.coerce.number().int().min(0),
  daily_rate: z.coerce.number().min(0),
  weekly_rate: z.coerce.number().min(0).optional(),
  monthly_rate: z.coerce.number().min(0).optional(),
  weekend_rate: z.coerce.number().min(0).optional(),
  security_deposit: z.coerce.number().min(0),
  mileage_limit: z.coerce.number().int().min(0),
  extra_mileage_fee: z.coerce.number().min(0),
  cleaning_fee: z.coerce.number().min(0),
  late_fee: z.coerce.number().min(0),
  smoking_fee: z.coerce.number().min(0),
  fuel_policy: z.string().max(200),
  status: z.enum([
    "available", "rented", "maintenance", "inactive", "turo", "reserved",
  ]),
  main_image_url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().max(2000).optional().or(z.literal("")),
  registration_expiration: z.string().optional().or(z.literal("")),
  insurance_expiration: z.string().optional().or(z.literal("")),
  gps_device_id: z.string().max(60).optional().or(z.literal("")),
  is_featured: z.coerce.boolean().optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

// --- Customer ---------------------------------------------------------------
export const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(80),
  last_name: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(40).optional().or(z.literal("")),
  zip: z.string().max(12).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  dl_number: z.string().max(40).optional().or(z.literal("")),
  dl_state: z.string().max(20).optional().or(z.literal("")),
  dl_expiration: z.string().optional().or(z.literal("")),
  insurance_company: z.string().max(120).optional().or(z.literal("")),
  insurance_policy_no: z.string().max(60).optional().or(z.literal("")),
  claim_number: z.string().max(60).optional().or(z.literal("")),
  adjuster_name: z.string().max(120).optional().or(z.literal("")),
  adjuster_email: z.string().email().optional().or(z.literal("")),
  adjuster_phone: z.string().max(30).optional().or(z.literal("")),
  is_vip: z.coerce.boolean().optional(),
  is_blacklisted: z.coerce.boolean().optional(),
  documents_verified: z.coerce.boolean().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// --- Reservation ------------------------------------------------------------
export const reservationSchema = z.object({
  customer_id: z.string().uuid("Select a customer"),
  vehicle_id: z.string().uuid("Select a vehicle"),
  pickup_at: z.string().min(1, "Pickup date is required"),
  return_at: z.string().min(1, "Return date is required"),
  rate_type: z.enum(["daily", "weekly", "monthly", "weekend"]),
  rate_amount: z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  discount_reason: z.string().max(200).optional().or(z.literal("")),
  status: z.enum([
    "quote", "pending", "confirmed", "active",
    "completed", "cancelled", "no_show", "overdue",
  ]),
  source: z.enum([
    "website", "phone", "walk_in", "insurance", "body_shop", "turo", "other",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
