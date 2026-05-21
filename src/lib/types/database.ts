// ============================================================================
// Car Mart Rentals — Database types
// Hand-written to mirror supabase/migrations. Keep in sync with the schema.
// ============================================================================

// --- Enums ------------------------------------------------------------------
export type UserRole = "super_admin" | "manager" | "staff" | "accountant" | "viewer";
export type VehicleStatus =
  | "available" | "rented" | "maintenance" | "inactive" | "turo" | "reserved";
export type VehicleCategory =
  | "luxury" | "suv" | "sedan" | "sports" | "electric" | "economy";
export type FuelType = "gasoline" | "hybrid" | "electric" | "diesel";
export type TransmissionType = "automatic" | "manual";
export type ReservationStatus =
  | "quote" | "pending" | "confirmed" | "active"
  | "completed" | "cancelled" | "no_show" | "overdue";
export type ReservationSource =
  | "website" | "phone" | "walk_in" | "insurance" | "body_shop" | "turo" | "other";
export type RateType = "daily" | "weekly" | "monthly" | "weekend";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentType = "payment" | "deposit" | "refund" | "adjustment";
export type PaymentMethod = "card" | "cash" | "bank_transfer" | "stripe" | "other";
export type PaymentRecordStatus =
  | "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
export type DepositStatus =
  | "pending" | "authorized" | "captured" | "partially_captured" | "released" | "refunded";
export type InspectionType = "checkout" | "checkin";
export type DamageSeverity = "minor" | "moderate" | "major";
export type RepairStatus = "reported" | "in_repair" | "repaired" | "not_repaired";
export type MaintenanceType =
  | "oil_change" | "tire_rotation" | "tires" | "brakes" | "registration"
  | "insurance" | "inspection" | "detailing" | "repair" | "other";
export type MaintenanceStatus =
  | "scheduled" | "in_progress" | "completed" | "overdue" | "cancelled";
export type InvoiceType = "invoice" | "quote" | "receipt";
export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue" | "void";
export type ChargeType =
  | "base_rate" | "add_on" | "fee" | "discount" | "tax" | "damage"
  | "mileage" | "fuel" | "late" | "cleaning" | "smoking" | "custom";
export type AddonPriceType = "per_day" | "per_rental";
export type FeeType = "fixed" | "percentage";
export type NotificationChannel = "email" | "sms";
export type NotificationStatus = "pending" | "sent" | "failed";

// --- Tables -----------------------------------------------------------------
export interface Role {
  id: number;
  name: UserRole;
  label: string;
  description: string | null;
  permissions: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  business_hours: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  date_of_birth: string | null;
  dl_number: string | null;
  dl_state: string | null;
  dl_expiration: string | null;
  dl_front_url: string | null;
  dl_back_url: string | null;
  insurance_doc_url: string | null;
  insurance_company: string | null;
  insurance_policy_no: string | null;
  claim_number: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  is_vip: boolean;
  documents_verified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  slug: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  license_plate: string | null;
  color: string | null;
  category: VehicleCategory;
  seats: number;
  doors: number;
  fuel_type: FuelType;
  transmission: TransmissionType;
  odometer: number;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  weekend_rate: number | null;
  security_deposit: number;
  mileage_limit: number;
  extra_mileage_fee: number;
  cleaning_fee: number;
  late_fee: number;
  smoking_fee: number;
  fuel_policy: string;
  status: VehicleStatus;
  location_id: string | null;
  main_image_url: string | null;
  features: string[];
  description: string | null;
  internal_notes: string | null;
  registration_expiration: string | null;
  insurance_expiration: string | null;
  gps_device_id: string | null;
  gps_provider: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_last_ping_at: string | null;
  gps_speed: number | null;
  gps_heading: number | null;
  gps_ignition: boolean | null;
  gps_address: string | null;
  gps_battery: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: AddonPriceType;
  category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Fee {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  fee_type: FeeType;
  category: string | null;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgreementSection {
  title: string;
  body: string;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  description: string | null;
  sections: AgreementSection[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_number: string;
  customer_id: string | null;
  vehicle_id: string | null;
  pickup_at: string;
  return_at: string;
  pickup_location_id: string | null;
  return_location_id: string | null;
  rate_type: RateType;
  rate_amount: number;
  rental_days: number;
  discount_amount: number;
  discount_reason: string | null;
  subtotal: number;
  addons_total: number;
  fees_total: number;
  tax_amount: number;
  total: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
  status: ReservationStatus;
  source: ReservationSource;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationCharge {
  id: string;
  reservation_id: string;
  charge_type: ChargeType;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  is_taxable: boolean;
  add_on_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  reservation_id: string | null;
  amount: number;
  payment_type: PaymentType;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  reference: string | null;
  notes: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface Deposit {
  id: string;
  reservation_id: string;
  amount: number;
  status: DepositStatus;
  stripe_payment_intent_id: string | null;
  authorized_at: string | null;
  captured_amount: number;
  captured_at: string | null;
  released_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  reservation_id: string;
  inspection_type: InspectionType;
  odometer: number | null;
  fuel_level: number | null;
  exterior_clean: boolean;
  interior_clean: boolean;
  customer_signature_url: string | null;
  staff_signature_url: string | null;
  inspector_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  url: string;
  category: string;
  caption: string | null;
  created_at: string;
}

export interface Damage {
  id: string;
  vehicle_id: string;
  reservation_id: string | null;
  inspection_id: string | null;
  location: string;
  description: string | null;
  severity: DamageSeverity;
  photo_urls: string[];
  before_photo_url: string | null;
  after_photo_url: string | null;
  reported_date: string;
  repair_status: RepairStatus;
  estimated_cost: number;
  actual_cost: number;
  charged_to_customer: boolean;
  charge_amount: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  service_date: string | null;
  due_date: string | null;
  due_mileage: number | null;
  odometer_at_service: number | null;
  status: MaintenanceStatus;
  cost: number;
  vendor: string | null;
  receipt_url: string | null;
  downtime_start: string | null;
  downtime_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  reservation_id: string | null;
  customer_id: string | null;
  invoice_type: InvoiceType;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: InvoiceStatus;
  pdf_url: string | null;
  issued_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agreement {
  id: string;
  reservation_id: string;
  template_id: string | null;
  title: string;
  content: AgreementSection[];
  customer_signature_url: string | null;
  staff_signature_url: string | null;
  signed_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string | null;
  status: NotificationStatus;
  reservation_id: string | null;
  customer_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
  label: string | null;
  description: string | null;
  updated_at: string;
}

// --- Joined / view types ----------------------------------------------------
export type VehicleWithImages = Vehicle & { vehicle_images: VehicleImage[] };

export type ReservationWithRelations = Reservation & {
  customer: Customer | null;
  vehicle: Vehicle | null;
};

export type CustomerWithStats = Customer & {
  reservation_count?: number;
  total_spent?: number;
};

// --- Business expansion (migration 0006) ------------------------------------
export type ExpenseCategory =
  | "fuel" | "maintenance" | "repairs" | "insurance" | "registration"
  | "cleaning" | "marketing" | "supplies" | "payroll" | "rent"
  | "utilities" | "software" | "other";
export type ViolationType =
  | "toll" | "parking" | "speeding" | "red_light" | "citation"
  | "impound" | "other";
export type ViolationStatus =
  | "unpaid" | "paid" | "charged_to_customer" | "disputed" | "waived";
export type LeadStatus = "new" | "contacted" | "quoted" | "converted" | "lost";
export type LeadSource =
  | "website" | "phone" | "referral" | "walk_in" | "social" | "other";
export type DiscountType = "percentage" | "fixed";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  vehicle_id: string | null;
  odometer: number | null;
  vendor: string | null;
  payment_method: PaymentMethod;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TollViolation {
  id: string;
  vehicle_id: string | null;
  reservation_id: string | null;
  violation_type: ViolationType;
  description: string | null;
  location: string | null;
  amount: number;
  incurred_date: string;
  status: ViolationStatus;
  charged_to_customer: boolean;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: LeadSource;
  status: LeadStatus;
  interested_vehicle_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_rental_days: number;
  max_uses: number | null;
  times_used: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Operations expansion (migration 0008) ----------------------------------
export type BlockType =
  | "maintenance" | "personal" | "turo" | "hold" | "reserved_offline" | "other";
export type ClaimStatus =
  | "open" | "authorized" | "in_progress" | "billed" | "paid" | "closed" | "denied";

export interface VehicleBlock {
  id: string;
  vehicle_id: string;
  start_at: string;
  end_at: string;
  block_type: BlockType;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  customer_id: string | null;
  reservation_id: string | null;
  vehicle_id: string | null;
  reviewer_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_published: boolean;
  created_at: string;
}

export interface InsuranceClaim {
  id: string;
  claim_number: string;
  customer_id: string | null;
  reservation_id: string | null;
  insurance_company: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  status: ClaimStatus;
  authorized_amount: number;
  deductible: number;
  claim_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Vehicle documents (migration 0009) -------------------------------------
export type VehicleDocType =
  | "registration"
  | "insurance"
  | "title"
  | "inspection"
  | "smog_emissions"
  | "lease_finance"
  | "purchase"
  | "warranty"
  | "other";

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: VehicleDocType;
  name: string;
  file_url: string;
  file_path: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// --- Customer reservation requests (migration 0011) -------------------------
export type ReservationRequestType = "extension" | "early_return";
export type ReservationRequestStatus = "pending" | "approved" | "declined";

export interface ReservationRequest {
  id: string;
  reservation_id: string;
  customer_id: string | null;
  request_type: ReservationRequestType;
  requested_at: string | null;
  estimated_cost: number | null;
  note: string | null;
  status: ReservationRequestStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
