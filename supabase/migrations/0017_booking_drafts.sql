-- ============================================================================
-- 0017 — Abandoned-booking recovery
-- Captures a booking-in-progress so the reminder job can email customers
-- who started but never completed a reservation.
-- ============================================================================

create table if not exists booking_drafts (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid references vehicles(id) on delete set null,
  email       text not null,
  first_name  text,
  pickup_at   timestamptz,
  return_at   timestamptz,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);

create index if not exists idx_booking_drafts_lookup
  on booking_drafts(status, created_at);
create index if not exists idx_booking_drafts_email
  on booking_drafts(lower(email));

alter table booking_drafts enable row level security;
