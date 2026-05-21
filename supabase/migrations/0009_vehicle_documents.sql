-- ============================================================================
-- Car Mart Rentals — Vehicle documents
-- Migration 0009: per-vehicle document storage (registration, insurance, etc.)
-- ============================================================================

create type vehicle_doc_type as enum (
  'registration',
  'insurance',
  'title',
  'inspection',
  'smog_emissions',
  'lease_finance',
  'purchase',
  'warranty',
  'other'
);

-- ----------------------------------------------------------------------------
-- VEHICLE DOCUMENTS — files attached to a vehicle, with optional expiry dates
-- ----------------------------------------------------------------------------
create table vehicle_documents (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles(id) on delete cascade,
  doc_type    vehicle_doc_type not null default 'other',
  name        text not null,
  file_url    text not null,
  file_path   text,
  issue_date  date,
  expiry_date date,
  notes       text,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_vehicle_documents_vehicle on vehicle_documents(vehicle_id);
create index idx_vehicle_documents_expiry on vehicle_documents(expiry_date)
  where expiry_date is not null;

-- ----------------------------------------------------------------------------
-- RLS — staff only (documents are uploaded/served via the service role)
-- ----------------------------------------------------------------------------
alter table vehicle_documents enable row level security;

create policy "staff read vehicle documents" on vehicle_documents
  for select to authenticated using (is_staff());
