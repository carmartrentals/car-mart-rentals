// ============================================================================
// Car Mart Rentals — shared constants & labels
// ============================================================================

import type {
  VehicleStatus,
  VehicleCategory,
  ReservationStatus,
  ReservationSource,
  PaymentStatus,
  UserRole,
  FuelType,
  MaintenanceStatus,
  DepositStatus,
} from "@/lib/types/database";

export const COMPANY = {
  name: "Car Mart Rentals",
  tagline: "Luxury & Insurance Replacement Rentals",
  email: "contact@carmartrentals.com",
  phone: "(323) 555-0142",
  phoneHref: "tel:+13235550142",
  address: "1450 Auto Center Dr, Los Angeles, CA 90001",
} as const;

// --- Badge styling: maps a status to Tailwind classes ----------------------
type BadgeTone =
  | "green" | "blue" | "amber" | "red" | "gray" | "purple" | "indigo";

export const BADGE_TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export const VEHICLE_STATUS: Record<
  VehicleStatus,
  { label: string; tone: BadgeTone }
> = {
  available: { label: "Available", tone: "green" },
  rented: { label: "Rented", tone: "blue" },
  reserved: { label: "Reserved", tone: "indigo" },
  maintenance: { label: "Maintenance", tone: "amber" },
  turo: { label: "On Turo", tone: "purple" },
  inactive: { label: "Inactive", tone: "gray" },
};

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; tone: BadgeTone }
> = {
  quote: { label: "Quote", tone: "gray" },
  pending: { label: "Pending", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "indigo" },
  active: { label: "Active", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "gray" },
  no_show: { label: "No-Show", tone: "red" },
  overdue: { label: "Overdue", tone: "red" },
};

export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; tone: BadgeTone }
> = {
  unpaid: { label: "Unpaid", tone: "red" },
  partial: { label: "Partial", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
  refunded: { label: "Refunded", tone: "gray" },
};

export const DEPOSIT_STATUS: Record<
  DepositStatus,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: "Pending", tone: "gray" },
  authorized: { label: "Authorized", tone: "blue" },
  captured: { label: "Captured", tone: "amber" },
  partially_captured: { label: "Partially Captured", tone: "amber" },
  released: { label: "Released", tone: "green" },
  refunded: { label: "Refunded", tone: "gray" },
};

export const MAINTENANCE_STATUS: Record<
  MaintenanceStatus,
  { label: string; tone: BadgeTone }
> = {
  scheduled: { label: "Scheduled", tone: "blue" },
  in_progress: { label: "In Progress", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  cancelled: { label: "Cancelled", tone: "gray" },
};

export const VEHICLE_CATEGORIES: Record<VehicleCategory, string> = {
  luxury: "Luxury",
  suv: "SUV",
  sedan: "Sedan",
  sports: "Sports",
  electric: "Electric",
  economy: "Economy",
};

export const FUEL_TYPES: Record<FuelType, string> = {
  gasoline: "Gasoline",
  hybrid: "Hybrid",
  electric: "Electric",
  diesel: "Diesel",
};

export const RESERVATION_SOURCES: Record<ReservationSource, string> = {
  website: "Website",
  phone: "Phone",
  walk_in: "Walk-in",
  insurance: "Insurance",
  body_shop: "Body Shop",
  turo: "Turo",
  other: "Other",
};

export const USER_ROLES: Record<UserRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
  accountant: "Accountant",
  viewer: "Viewer",
};

// Statuses that block a vehicle's calendar (no double-booking).
export const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
  "active",
  "overdue",
];
