-- ============================================================================
-- Car Mart Rentals
-- Migration 0011: Customer reservation requests (extension / early return)
--
-- Customers can ask to extend or return a rental early from their portal.
-- These requests now surface in the admin dashboard and reservation page.
-- ============================================================================

create type reservation_request_type as enum ('extension', 'early_return');
create type reservation_request_status as enum ('pending', 'approved', 'declined');

create table reservation_requests (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid not null references reservations(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  request_type    reservation_request_type not null,
  requested_at    timestamptz,
  note            text,
  status          reservation_request_status not null default 'pending',
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references users(id) on delete set null
);
create index idx_reservation_requests_status on reservation_requests(status);
create index idx_reservation_requests_reservation
  on reservation_requests(reservation_id);

alter table reservation_requests enable row level security;

create policy "staff read reservation requests" on reservation_requests
  for select to authenticated using (is_staff());
