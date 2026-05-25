-- ============================================================================
-- 0023 — Toll passthrough: charge tolls back to the renter automatically
--
-- Adds the fields needed for a 'PlatePass-style' workflow at small-operator
-- scale: when a FasTrak invoice comes in, find the reservation that had the
-- car at that moment, add the toll + a configurable handling fee as a line
-- item on that reservation, email the customer a receipt.
-- ============================================================================

alter table toll_violations
  add column if not exists handling_fee         numeric(10,2) not null default 0,
  add column if not exists customer_charge_total numeric(10,2),
  add column if not exists customer_charge_id   uuid references reservation_charges(id) on delete set null,
  add column if not exists customer_charged_at  timestamptz;

create index if not exists idx_violations_reservation
  on toll_violations(reservation_id);
