-- ============================================================================
-- Car Mart Rentals — Business expansion modules
-- Migration 0006: expenses, toll & violation tracking, sales leads, promo codes
-- ============================================================================

create type expense_category as enum (
  'fuel', 'maintenance', 'repairs', 'insurance', 'registration', 'cleaning',
  'marketing', 'supplies', 'payroll', 'rent', 'utilities', 'software', 'other'
);
create type violation_type as enum (
  'toll', 'parking', 'speeding', 'red_light', 'citation', 'impound', 'other'
);
create type violation_status as enum (
  'unpaid', 'paid', 'charged_to_customer', 'disputed', 'waived'
);
create type lead_status as enum ('new', 'contacted', 'quoted', 'converted', 'lost');
create type lead_source as enum (
  'website', 'phone', 'referral', 'walk_in', 'social', 'other'
);
create type discount_type as enum ('percentage', 'fixed');

-- ----------------------------------------------------------------------------
-- EXPENSES — business cost tracking (fuel, maintenance, overhead...)
-- ----------------------------------------------------------------------------
create table expenses (
  id             uuid primary key default gen_random_uuid(),
  category       expense_category not null default 'other',
  description    text not null,
  amount         numeric(10,2) not null default 0,
  expense_date   date not null default current_date,
  vehicle_id     uuid references vehicles(id) on delete set null,
  odometer       int,
  vendor         text,
  payment_method payment_method not null default 'card',
  receipt_url    text,
  notes          text,
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_expenses_updated before update on expenses
  for each row execute function set_updated_at();
create index idx_expenses_date on expenses(expense_date desc);
create index idx_expenses_vehicle on expenses(vehicle_id);
create index idx_expenses_category on expenses(category);

-- ----------------------------------------------------------------------------
-- TOLL & VIOLATIONS — tolls, tickets and citations
-- ----------------------------------------------------------------------------
create table toll_violations (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid references vehicles(id) on delete set null,
  reservation_id      uuid references reservations(id) on delete set null,
  violation_type      violation_type not null default 'toll',
  description         text,
  location            text,
  amount              numeric(10,2) not null default 0,
  incurred_date       date not null default current_date,
  status              violation_status not null default 'unpaid',
  charged_to_customer boolean not null default false,
  reference_number    text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_violations_updated before update on toll_violations
  for each row execute function set_updated_at();
create index idx_violations_vehicle on toll_violations(vehicle_id);
create index idx_violations_status on toll_violations(status);

-- ----------------------------------------------------------------------------
-- LEADS — sales inquiries and prospective customers
-- ----------------------------------------------------------------------------
create table leads (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  email                text,
  phone                text,
  message              text,
  source               lead_source not null default 'website',
  status               lead_status not null default 'new',
  interested_vehicle_id uuid references vehicles(id) on delete set null,
  assigned_to          uuid references users(id) on delete set null,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();
create index idx_leads_status on leads(status);

-- ----------------------------------------------------------------------------
-- PROMO CODES — discount codes for reservations
-- ----------------------------------------------------------------------------
create table promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  description     text,
  discount_type   discount_type not null default 'percentage',
  discount_value  numeric(10,2) not null default 0,
  min_rental_days int not null default 1,
  max_uses        int,
  times_used      int not null default 0,
  valid_from      date,
  valid_until     date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_promo_codes_updated before update on promo_codes
  for each row execute function set_updated_at();
create index idx_promo_codes_code on promo_codes(lower(code));

-- ----------------------------------------------------------------------------
-- RLS — admin-managed (service role); no public access.
-- ----------------------------------------------------------------------------
alter table expenses        enable row level security;
alter table toll_violations enable row level security;
alter table leads           enable row level security;
alter table promo_codes     enable row level security;

create policy "staff read expenses"   on expenses        for select to authenticated using (is_staff());
create policy "staff read violations" on toll_violations for select to authenticated using (is_staff());
create policy "staff read leads"      on leads           for select to authenticated using (is_staff());
create policy "staff read promo"      on promo_codes     for select to authenticated using (is_staff());
