-- ============================================================================
-- Car Mart Rentals — Row Level Security
-- Migration 0002
--
-- Security model:
--  * Admin/staff operations run server-side with the SERVICE ROLE key, which
--    bypasses RLS. Authorization is enforced in the app layer by checking the
--    signed-in user's role (see src/lib/auth).
--  * The public website uses the ANON key and may only read published fleet
--    data (vehicles, images, locations, add-ons, fees).
--  * Customer-portal users (authenticated) may read their own customer record
--    and reservations.
-- ============================================================================

-- Enable RLS everywhere.
alter table roles                enable row level security;
alter table users                enable row level security;
alter table locations            enable row level security;
alter table customers            enable row level security;
alter table vehicles             enable row level security;
alter table vehicle_images       enable row level security;
alter table add_ons              enable row level security;
alter table fees                 enable row level security;
alter table agreement_templates  enable row level security;
alter table reservations         enable row level security;
alter table reservation_charges  enable row level security;
alter table payments             enable row level security;
alter table deposits             enable row level security;
alter table inspections          enable row level security;
alter table inspection_photos    enable row level security;
alter table damages              enable row level security;
alter table maintenance_records  enable row level security;
alter table invoices             enable row level security;
alter table agreements           enable row level security;
alter table notifications        enable row level security;
alter table email_templates      enable row level security;
alter table activity_logs        enable row level security;
alter table settings             enable row level security;

-- ----------------------------------------------------------------------------
-- PUBLIC READ — website fleet browsing
-- ----------------------------------------------------------------------------
create policy "public read vehicles" on vehicles
  for select to anon, authenticated
  using (status <> 'inactive');

create policy "public read vehicle images" on vehicle_images
  for select to anon, authenticated using (true);

create policy "public read locations" on locations
  for select to anon, authenticated using (is_active);

create policy "public read add-ons" on add_ons
  for select to anon, authenticated using (is_active);

create policy "public read fees" on fees
  for select to anon, authenticated using (is_active);

-- ----------------------------------------------------------------------------
-- STAFF — authenticated admin users have full read access to operational data
-- (writes still go through the service-role server layer)
-- ----------------------------------------------------------------------------
create policy "staff read customers"        on customers       for select to authenticated using (is_staff());
create policy "staff read reservations"     on reservations    for select to authenticated using (is_staff());
create policy "staff read charges"          on reservation_charges for select to authenticated using (is_staff());
create policy "staff read payments"         on payments        for select to authenticated using (is_staff());
create policy "staff read deposits"         on deposits        for select to authenticated using (is_staff());
create policy "staff read inspections"      on inspections     for select to authenticated using (is_staff());
create policy "staff read inspection photos" on inspection_photos for select to authenticated using (is_staff());
create policy "staff read damages"          on damages         for select to authenticated using (is_staff());
create policy "staff read maintenance"      on maintenance_records for select to authenticated using (is_staff());
create policy "staff read invoices"         on invoices        for select to authenticated using (is_staff());
create policy "staff read agreements"       on agreements      for select to authenticated using (is_staff());
create policy "staff read templates"        on agreement_templates for select to authenticated using (is_staff());
create policy "staff read notifications"    on notifications   for select to authenticated using (is_staff());
create policy "staff read email templates"  on email_templates for select to authenticated using (is_staff());
create policy "staff read activity"         on activity_logs   for select to authenticated using (is_staff());
create policy "staff read settings"         on settings        for select to authenticated using (is_staff());
create policy "staff read roles"            on roles           for select to authenticated using (is_staff());

create policy "user reads own profile" on users
  for select to authenticated using (id = auth.uid() or is_staff());

-- ----------------------------------------------------------------------------
-- CUSTOMER PORTAL — authenticated customers see only their own records
-- ----------------------------------------------------------------------------
create policy "customer reads own record" on customers
  for select to authenticated
  using (user_id = auth.uid() or is_staff());

create policy "customer reads own reservations" on reservations
  for select to authenticated
  using (
    is_staff()
    or customer_id in (select id from customers where user_id = auth.uid())
  );

create policy "customer reads own invoices" on invoices
  for select to authenticated
  using (
    is_staff()
    or customer_id in (select id from customers where user_id = auth.uid())
  );
