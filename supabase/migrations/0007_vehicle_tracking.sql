-- ============================================================================
-- Car Mart Rentals — Vehicle GPS tracking
-- Migration 0007: current-location telematics fields on vehicles
--
-- Live data is pushed in via /api/integrations/gps/ingest (provider-agnostic).
-- Match is by vehicles.gps_device_id.
-- ============================================================================

alter table vehicles
  add column if not exists gps_provider     text,
  add column if not exists gps_latitude     numeric(10,6),
  add column if not exists gps_longitude    numeric(10,6),
  add column if not exists gps_last_ping_at timestamptz,
  add column if not exists gps_speed        numeric(6,1),
  add column if not exists gps_heading      int,
  add column if not exists gps_ignition     boolean,
  add column if not exists gps_address      text,
  add column if not exists gps_battery      int;

create index if not exists idx_vehicles_gps_device
  on vehicles(gps_device_id)
  where gps_device_id is not null;
