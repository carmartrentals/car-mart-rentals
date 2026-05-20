-- ============================================================================
-- Car Mart Rentals — Storage buckets
-- Migration 0004
--
-- Buckets:
--   vehicle-photos  PUBLIC   fleet imagery shown on the website
--   documents       PRIVATE  driver licenses, insurance, customer IDs
--   inspections     PRIVATE  check-in / check-out photos
--   agreements      PRIVATE  signed rental agreement PDFs
--   invoices        PRIVATE  invoice / receipt PDFs
--   signatures      PRIVATE  e-signature images
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('vehicle-photos', 'vehicle-photos', true),
  ('documents',      'documents',      false),
  ('inspections',    'inspections',    false),
  ('agreements',     'agreements',     false),
  ('invoices',       'invoices',       false),
  ('signatures',     'signatures',     false)
on conflict (id) do nothing;

-- Public read for fleet photos.
create policy "public read vehicle photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vehicle-photos');

-- Authenticated staff can read private buckets.
create policy "staff read private buckets" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('documents', 'inspections', 'agreements', 'invoices', 'signatures')
    and is_staff()
  );

-- Note: writes/uploads are performed server-side with the service role key,
-- which bypasses these policies. See src/lib/supabase/admin.ts.
