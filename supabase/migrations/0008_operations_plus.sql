-- ============================================================================
-- Car Mart Rentals — Operations expansion
-- Migration 0008: vehicle blocks, reviews, insurance claims, reminder emails
-- ============================================================================

create type block_type as enum (
  'maintenance', 'personal', 'turo', 'hold', 'reserved_offline', 'other'
);
create type claim_status as enum (
  'open', 'authorized', 'in_progress', 'billed', 'paid', 'closed', 'denied'
);

-- ----------------------------------------------------------------------------
-- VEHICLE BLOCKS — calendar holds that are not reservations
-- ----------------------------------------------------------------------------
create table vehicle_blocks (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  block_type  block_type not null default 'other',
  reason      text,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint vehicle_blocks_dates_chk check (end_at > start_at)
);
create index idx_vehicle_blocks_vehicle on vehicle_blocks(vehicle_id);
create index idx_vehicle_blocks_dates on vehicle_blocks(vehicle_id, start_at, end_at);

-- ----------------------------------------------------------------------------
-- REVIEWS — customer ratings & testimonials
-- ----------------------------------------------------------------------------
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references customers(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  vehicle_id     uuid references vehicles(id) on delete set null,
  reviewer_name  text not null,
  rating         int not null check (rating between 1 and 5),
  title          text,
  comment        text,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_reviews_published on reviews(is_published) where is_published;

-- ----------------------------------------------------------------------------
-- INSURANCE CLAIMS — claim / body-shop replacement tracking
-- ----------------------------------------------------------------------------
create table insurance_claims (
  id                uuid primary key default gen_random_uuid(),
  claim_number      text not null,
  customer_id       uuid references customers(id) on delete set null,
  reservation_id    uuid references reservations(id) on delete set null,
  insurance_company text,
  adjuster_name     text,
  adjuster_email    text,
  adjuster_phone    text,
  status            claim_status not null default 'open',
  authorized_amount numeric(10,2) not null default 0,
  deductible        numeric(10,2) not null default 0,
  claim_date        date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_insurance_claims_updated before update on insurance_claims
  for each row execute function set_updated_at();
create index idx_insurance_claims_status on insurance_claims(status);

-- ----------------------------------------------------------------------------
-- Availability check now also respects manual vehicle blocks
-- ----------------------------------------------------------------------------
create or replace function is_vehicle_available(
  p_vehicle_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_reservation uuid default null
)
returns boolean language sql stable as $$
  select
    not exists (
      select 1 from reservations r
      where r.vehicle_id = p_vehicle_id
        and r.status in ('confirmed', 'active', 'overdue', 'pending')
        and (p_exclude_reservation is null or r.id <> p_exclude_reservation)
        and tstzrange(r.pickup_at, r.return_at) && tstzrange(p_start, p_end)
    )
    and not exists (
      select 1 from vehicle_blocks b
      where b.vehicle_id = p_vehicle_id
        and tstzrange(b.start_at, b.end_at) && tstzrange(p_start, p_end)
    );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table vehicle_blocks    enable row level security;
alter table reviews           enable row level security;
alter table insurance_claims  enable row level security;

create policy "staff read blocks" on vehicle_blocks
  for select to authenticated using (is_staff());
create policy "staff read claims" on insurance_claims
  for select to authenticated using (is_staff());
-- Published reviews are public (shown on the website).
create policy "public read published reviews" on reviews
  for select to anon, authenticated
  using (is_published or is_staff());

-- ----------------------------------------------------------------------------
-- Email templates for the automated reminder job
-- ----------------------------------------------------------------------------
insert into email_templates (key, name, subject, body_html, variables) values
  ('return_reminder', 'Return Reminder',
   'Reminder: your rental returns {{return_at}}',
   '<p>Hi {{customer_name}},</p><p>This is a friendly reminder that your {{vehicle_name}} ({{reservation_number}}) is due back on {{return_at}}.</p><p>Need more time? Contact us to request an extension.</p>',
   '["customer_name","vehicle_name","reservation_number","return_at"]'::jsonb),
  ('overdue_alert', 'Overdue Rental Alert',
   'Your rental {{reservation_number}} is overdue',
   '<p>Hi {{customer_name}},</p><p>Our records show the {{vehicle_name}} ({{reservation_number}}) was due back on {{return_at}} and has not yet been returned. Please return it as soon as possible or contact us — late fees may apply.</p>',
   '["customer_name","vehicle_name","reservation_number","return_at"]'::jsonb),
  ('document_reminder', 'Document Reminder',
   'Action needed: upload your rental documents',
   '<p>Hi {{customer_name}},</p><p>Your upcoming rental ({{reservation_number}}) still needs your driver license and insurance. Please upload them in your account so we can verify you before pickup.</p>',
   '["customer_name","reservation_number"]'::jsonb)
on conflict (key) do nothing;
