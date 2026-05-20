-- ============================================================================
-- Car Mart Rentals — Core Schema
-- Migration 0001: extensions, enums, tables, indexes, triggers
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('super_admin', 'manager', 'staff', 'accountant', 'viewer');
create type vehicle_status as enum ('available', 'rented', 'maintenance', 'inactive', 'turo', 'reserved');
create type vehicle_category as enum ('luxury', 'suv', 'sedan', 'sports', 'electric', 'economy');
create type fuel_type as enum ('gasoline', 'hybrid', 'electric', 'diesel');
create type transmission_type as enum ('automatic', 'manual');
create type reservation_status as enum ('quote', 'pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show', 'overdue');
create type reservation_source as enum ('website', 'phone', 'walk_in', 'insurance', 'body_shop', 'turo', 'other');
create type rate_type as enum ('daily', 'weekly', 'monthly', 'weekend');
create type payment_status as enum ('unpaid', 'partial', 'paid', 'refunded');
create type payment_type as enum ('payment', 'deposit', 'refund', 'adjustment');
create type payment_method as enum ('card', 'cash', 'bank_transfer', 'stripe', 'other');
create type payment_record_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'cancelled');
create type deposit_status as enum ('pending', 'authorized', 'captured', 'partially_captured', 'released', 'refunded');
create type inspection_type as enum ('checkout', 'checkin');
create type damage_severity as enum ('minor', 'moderate', 'major');
create type repair_status as enum ('reported', 'in_repair', 'repaired', 'not_repaired');
create type maintenance_type as enum ('oil_change', 'tire_rotation', 'tires', 'brakes', 'registration', 'insurance', 'inspection', 'detailing', 'repair', 'other');
create type maintenance_status as enum ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');
create type invoice_type as enum ('invoice', 'quote', 'receipt');
create type invoice_status as enum ('draft', 'issued', 'partial', 'paid', 'overdue', 'void');
create type charge_type as enum ('base_rate', 'add_on', 'fee', 'discount', 'tax', 'damage', 'mileage', 'fuel', 'late', 'cleaning', 'smoking', 'custom');
create type addon_price_type as enum ('per_day', 'per_rental');
create type fee_type as enum ('fixed', 'percentage');
create type notification_channel as enum ('email', 'sms');
create type notification_status as enum ('pending', 'sent', 'failed');

-- ----------------------------------------------------------------------------
-- SHARED: updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- ROLES — permission definitions
-- ----------------------------------------------------------------------------
create table roles (
  id          serial primary key,
  name        user_role not null unique,
  label       text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- USERS — admin / staff profiles (linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null default '',
  phone         text,
  role          user_role not null default 'viewer',
  avatar_url    text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_users_updated before update on users for each row execute function set_updated_at();
create index idx_users_role on users(role);

-- ----------------------------------------------------------------------------
-- LOCATIONS
-- ----------------------------------------------------------------------------
create table locations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  address        text,
  city           text,
  state          text,
  zip            text,
  phone          text,
  email          text,
  business_hours jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_locations_updated before update on locations for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- CUSTOMERS — CRM
-- ----------------------------------------------------------------------------
create table customers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  first_name          text not null,
  last_name           text not null,
  email               text not null,
  phone               text,
  address             text,
  city                text,
  state               text,
  zip                 text,
  date_of_birth       date,
  dl_number           text,
  dl_state            text,
  dl_expiration       date,
  dl_front_url        text,
  dl_back_url         text,
  insurance_doc_url   text,
  insurance_company   text,
  insurance_policy_no text,
  claim_number        text,
  adjuster_name       text,
  adjuster_email      text,
  adjuster_phone      text,
  is_blacklisted      boolean not null default false,
  blacklist_reason    text,
  is_vip              boolean not null default false,
  documents_verified  boolean not null default false,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_customers_updated before update on customers for each row execute function set_updated_at();
create index idx_customers_email on customers(lower(email));
create index idx_customers_name on customers(lower(last_name), lower(first_name));
create index idx_customers_user on customers(user_id);

-- ----------------------------------------------------------------------------
-- VEHICLES — fleet
-- ----------------------------------------------------------------------------
create table vehicles (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  vin                     text unique,
  year                    int not null,
  make                    text not null,
  model                   text not null,
  trim                    text,
  license_plate           text,
  color                   text,
  category                vehicle_category not null default 'sedan',
  seats                   int not null default 5,
  doors                   int not null default 4,
  fuel_type               fuel_type not null default 'gasoline',
  transmission            transmission_type not null default 'automatic',
  odometer                int not null default 0,
  daily_rate              numeric(10,2) not null default 0,
  weekly_rate             numeric(10,2),
  monthly_rate            numeric(10,2),
  weekend_rate            numeric(10,2),
  security_deposit        numeric(10,2) not null default 0,
  mileage_limit           int not null default 200,        -- miles per day; 0 = unlimited
  extra_mileage_fee       numeric(10,2) not null default 0, -- per mile
  cleaning_fee            numeric(10,2) not null default 0,
  late_fee                numeric(10,2) not null default 0, -- per hour
  smoking_fee             numeric(10,2) not null default 0,
  fuel_policy             text not null default 'Return with same fuel level',
  status                  vehicle_status not null default 'available',
  location_id             uuid references locations(id) on delete set null,
  main_image_url          text,
  features                text[] not null default '{}',
  description             text,
  internal_notes          text,
  registration_expiration date,
  insurance_expiration    date,
  gps_device_id           text,
  is_featured             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_vehicles_updated before update on vehicles for each row execute function set_updated_at();
create index idx_vehicles_status on vehicles(status);
create index idx_vehicles_category on vehicles(category);
create index idx_vehicles_featured on vehicles(is_featured) where is_featured;

-- ----------------------------------------------------------------------------
-- VEHICLE IMAGES — gallery
-- ----------------------------------------------------------------------------
create table vehicle_images (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  url        text not null,
  caption    text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_vehicle_images_vehicle on vehicle_images(vehicle_id);

-- ----------------------------------------------------------------------------
-- ADD-ONS & FEES
-- ----------------------------------------------------------------------------
create table add_ons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  price_type  addon_price_type not null default 'per_rental',
  category    text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_addons_updated before update on add_ons for each row execute function set_updated_at();

create table fees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  amount      numeric(10,2) not null default 0,
  fee_type    fee_type not null default 'fixed',
  category    text,
  is_taxable  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_fees_updated before update on fees for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- AGREEMENT TEMPLATES
-- ----------------------------------------------------------------------------
create table agreement_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sections    jsonb not null default '[]'::jsonb,  -- [{ title, body }]
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_agreement_templates_updated before update on agreement_templates for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RESERVATIONS
-- ----------------------------------------------------------------------------
create sequence if not exists reservation_number_seq start 1001;

create table reservations (
  id                  uuid primary key default gen_random_uuid(),
  reservation_number  text not null unique,
  customer_id         uuid references customers(id) on delete set null,
  vehicle_id          uuid references vehicles(id) on delete set null,
  pickup_at           timestamptz not null,
  return_at           timestamptz not null,
  pickup_location_id  uuid references locations(id) on delete set null,
  return_location_id  uuid references locations(id) on delete set null,
  rate_type           rate_type not null default 'daily',
  rate_amount         numeric(10,2) not null default 0,
  rental_days         int not null default 1,
  discount_amount     numeric(10,2) not null default 0,
  discount_reason     text,
  subtotal            numeric(10,2) not null default 0,
  addons_total        numeric(10,2) not null default 0,
  fees_total          numeric(10,2) not null default 0,
  tax_amount          numeric(10,2) not null default 0,
  total               numeric(10,2) not null default 0,
  deposit_amount      numeric(10,2) not null default 0,
  amount_paid         numeric(10,2) not null default 0,
  balance_due         numeric(10,2) not null default 0,
  payment_status      payment_status not null default 'unpaid',
  status              reservation_status not null default 'quote',
  source              reservation_source not null default 'website',
  notes               text,
  internal_notes      text,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint reservations_dates_chk check (return_at > pickup_at)
);
create trigger trg_reservations_updated before update on reservations for each row execute function set_updated_at();
create index idx_reservations_customer on reservations(customer_id);
create index idx_reservations_vehicle on reservations(vehicle_id);
create index idx_reservations_status on reservations(status);
create index idx_reservations_pickup on reservations(pickup_at);
create index idx_reservations_dates on reservations(vehicle_id, pickup_at, return_at);

-- Prevent double-booking for blocking statuses.
alter table reservations add constraint reservations_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(pickup_at, return_at) with &&
  ) where (status in ('confirmed', 'active', 'overdue'));

-- Auto reservation number: RES-001001
create or replace function assign_reservation_number()
returns trigger language plpgsql as $$
begin
  if new.reservation_number is null or new.reservation_number = '' then
    new.reservation_number := 'RES-' || lpad(nextval('reservation_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
create trigger trg_reservation_number before insert on reservations
  for each row execute function assign_reservation_number();

-- ----------------------------------------------------------------------------
-- RESERVATION CHARGES — line items
-- ----------------------------------------------------------------------------
create table reservation_charges (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  charge_type    charge_type not null default 'custom',
  description    text not null,
  quantity       numeric(10,2) not null default 1,
  unit_price     numeric(10,2) not null default 0,
  amount         numeric(10,2) not null default 0,
  is_taxable     boolean not null default true,
  add_on_id      uuid references add_ons(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index idx_reservation_charges_reservation on reservation_charges(reservation_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------------------
create table payments (
  id                       uuid primary key default gen_random_uuid(),
  reservation_id           uuid references reservations(id) on delete set null,
  amount                   numeric(10,2) not null,
  payment_type             payment_type not null default 'payment',
  method                   payment_method not null default 'card',
  status                   payment_record_status not null default 'succeeded',
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  reference                text,
  notes                    text,
  processed_by             uuid references users(id) on delete set null,
  created_at               timestamptz not null default now()
);
create index idx_payments_reservation on payments(reservation_id);
create index idx_payments_stripe_pi on payments(stripe_payment_intent_id);

-- ----------------------------------------------------------------------------
-- DEPOSITS
-- ----------------------------------------------------------------------------
create table deposits (
  id                       uuid primary key default gen_random_uuid(),
  reservation_id           uuid not null references reservations(id) on delete cascade,
  amount                   numeric(10,2) not null,
  status                   deposit_status not null default 'pending',
  stripe_payment_intent_id text,
  authorized_at            timestamptz,
  captured_amount          numeric(10,2) not null default 0,
  captured_at              timestamptz,
  released_at              timestamptz,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_deposits_updated before update on deposits for each row execute function set_updated_at();
create index idx_deposits_reservation on deposits(reservation_id);

-- ----------------------------------------------------------------------------
-- INSPECTIONS — check-out / check-in
-- ----------------------------------------------------------------------------
create table inspections (
  id                     uuid primary key default gen_random_uuid(),
  reservation_id         uuid not null references reservations(id) on delete cascade,
  inspection_type        inspection_type not null,
  odometer               int,
  fuel_level             int,  -- percent 0-100
  exterior_clean         boolean not null default true,
  interior_clean         boolean not null default true,
  customer_signature_url text,
  staff_signature_url    text,
  inspector_id           uuid references users(id) on delete set null,
  notes                  text,
  completed_at           timestamptz,
  created_at             timestamptz not null default now()
);
create index idx_inspections_reservation on inspections(reservation_id);

create table inspection_photos (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  url           text not null,
  category      text not null default 'exterior', -- exterior|interior|damage|document
  caption       text,
  created_at    timestamptz not null default now()
);
create index idx_inspection_photos_inspection on inspection_photos(inspection_id);

-- ----------------------------------------------------------------------------
-- DAMAGES
-- ----------------------------------------------------------------------------
create table damages (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references vehicles(id) on delete cascade,
  reservation_id      uuid references reservations(id) on delete set null,
  inspection_id       uuid references inspections(id) on delete set null,
  location            text not null,
  description         text,
  severity            damage_severity not null default 'minor',
  photo_urls          text[] not null default '{}',
  before_photo_url    text,
  after_photo_url     text,
  reported_date       date not null default current_date,
  repair_status       repair_status not null default 'reported',
  estimated_cost      numeric(10,2) not null default 0,
  actual_cost         numeric(10,2) not null default 0,
  charged_to_customer boolean not null default false,
  charge_amount       numeric(10,2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_damages_updated before update on damages for each row execute function set_updated_at();
create index idx_damages_vehicle on damages(vehicle_id);
create index idx_damages_reservation on damages(reservation_id);

-- ----------------------------------------------------------------------------
-- MAINTENANCE RECORDS
-- ----------------------------------------------------------------------------
create table maintenance_records (
  id                 uuid primary key default gen_random_uuid(),
  vehicle_id         uuid not null references vehicles(id) on delete cascade,
  maintenance_type   maintenance_type not null default 'other',
  description        text not null,
  service_date       date,
  due_date           date,
  due_mileage        int,
  odometer_at_service int,
  status             maintenance_status not null default 'scheduled',
  cost               numeric(10,2) not null default 0,
  vendor             text,
  receipt_url        text,
  downtime_start     date,
  downtime_end       date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_maintenance_updated before update on maintenance_records for each row execute function set_updated_at();
create index idx_maintenance_vehicle on maintenance_records(vehicle_id);
create index idx_maintenance_status on maintenance_records(status);

-- ----------------------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------------------
create sequence if not exists invoice_number_seq start 1001;

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  reservation_id uuid references reservations(id) on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  invoice_type   invoice_type not null default 'invoice',
  subtotal       numeric(10,2) not null default 0,
  tax_amount     numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  amount_paid    numeric(10,2) not null default 0,
  balance        numeric(10,2) not null default 0,
  status         invoice_status not null default 'draft',
  pdf_url        text,
  issued_date    date,
  due_date       date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_invoices_updated before update on invoices for each row execute function set_updated_at();
create index idx_invoices_reservation on invoices(reservation_id);
create index idx_invoices_customer on invoices(customer_id);

create or replace function assign_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
create trigger trg_invoice_number before insert on invoices
  for each row execute function assign_invoice_number();

-- ----------------------------------------------------------------------------
-- AGREEMENTS — signed rental agreements
-- ----------------------------------------------------------------------------
create table agreements (
  id                     uuid primary key default gen_random_uuid(),
  reservation_id         uuid not null references reservations(id) on delete cascade,
  template_id            uuid references agreement_templates(id) on delete set null,
  title                  text not null default 'Rental Agreement',
  content                jsonb not null default '[]'::jsonb,
  customer_signature_url text,
  staff_signature_url    text,
  signed_at              timestamptz,
  pdf_url                text,
  created_at             timestamptz not null default now()
);
create index idx_agreements_reservation on agreements(reservation_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  type           text not null,
  channel        notification_channel not null default 'email',
  recipient      text not null,
  subject        text,
  body           text,
  status         notification_status not null default 'pending',
  reservation_id uuid references reservations(id) on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  error          text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index idx_notifications_status on notifications(status);

create table email_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  subject    text not null,
  body_html  text not null default '',
  variables  jsonb not null default '[]'::jsonb,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_email_templates_updated before update on email_templates for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- ACTIVITY LOG
-- ----------------------------------------------------------------------------
create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  description text,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
create index idx_activity_logs_created on activity_logs(created_at desc);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- SETTINGS — key/value store
-- ----------------------------------------------------------------------------
create table settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null default '{}'::jsonb,
  category    text not null default 'general',
  label       text,
  description text,
  updated_at  timestamptz not null default now()
);
create trigger trg_settings_updated before update on settings for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- HELPER: availability check (used by API + admin)
-- ----------------------------------------------------------------------------
create or replace function is_vehicle_available(
  p_vehicle_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_reservation uuid default null
)
returns boolean language sql stable as $$
  select not exists (
    select 1 from reservations r
    where r.vehicle_id = p_vehicle_id
      and r.status in ('confirmed', 'active', 'overdue', 'pending')
      and (p_exclude_reservation is null or r.id <> p_exclude_reservation)
      and tstzrange(r.pickup_at, r.return_at) && tstzrange(p_start, p_end)
  );
$$;

-- ----------------------------------------------------------------------------
-- HELPER: current user's role (for RLS / customer portal)
-- ----------------------------------------------------------------------------
create or replace function current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid() and is_active);
$$;
