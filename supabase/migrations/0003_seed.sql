-- ============================================================================
-- Car Mart Rentals — Auth hook + seed data
-- Migration 0003
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AUTH: auto-create a public.users profile when an auth user is created.
-- The very first user should be promoted to super_admin (see README).
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- ROLES
-- ----------------------------------------------------------------------------
insert into roles (name, label, description, permissions) values
  ('super_admin', 'Super Admin', 'Full system access including settings and user management.',
    '{"all": true}'::jsonb),
  ('manager', 'Manager', 'Manage fleet, reservations, customers, check-in/out and reports.',
    '{"vehicles":"write","reservations":"write","customers":"write","checkinout":"write","reports":"read","payments":"write","settings":"read"}'::jsonb),
  ('staff', 'Staff', 'Day-to-day operations: reservations, check-in/out, customers.',
    '{"vehicles":"read","reservations":"write","customers":"write","checkinout":"write","reports":"none","payments":"read","settings":"none"}'::jsonb),
  ('accountant', 'Accountant', 'Payments, invoices, deposits and financial reports.',
    '{"vehicles":"read","reservations":"read","customers":"read","checkinout":"none","reports":"read","payments":"write","settings":"none"}'::jsonb),
  ('viewer', 'Viewer', 'Read-only access to dashboards and records.',
    '{"vehicles":"read","reservations":"read","customers":"read","checkinout":"none","reports":"read","payments":"read","settings":"none"}'::jsonb)
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- LOCATIONS
-- ----------------------------------------------------------------------------
insert into locations (name, address, city, state, zip, phone, email, business_hours, is_active) values
  ('Car Mart Rentals — Main Branch', '1450 Auto Center Dr', 'Los Angeles', 'CA', '90001',
   '(323) 555-0142', 'reservations@carmartrentals.com',
   '{"mon":"8:00-18:00","tue":"8:00-18:00","wed":"8:00-18:00","thu":"8:00-18:00","fri":"8:00-19:00","sat":"9:00-17:00","sun":"closed"}'::jsonb,
   true);

-- ----------------------------------------------------------------------------
-- SETTINGS
-- ----------------------------------------------------------------------------
insert into settings (key, value, category, label, description) values
  ('company_profile',
   '{"name":"Car Mart Rentals","legal_name":"Car Mart Rentals LLC","email":"reservations@carmartrentals.com","phone":"(323) 555-0142","website":"https://carmartrentals.com","address":"1450 Auto Center Dr, Los Angeles, CA 90001","logo_url":""}'::jsonb,
   'general', 'Company Profile', 'Business identity used on the website and documents.'),
  ('tax', '{"rate":9.5,"label":"Sales Tax","enabled":true}'::jsonb,
   'finance', 'Tax', 'Default sales tax applied to taxable charges.'),
  ('booking_rules',
   '{"min_rental_days":1,"max_rental_days":90,"min_driver_age":21,"buffer_hours":2,"advance_booking_hours":2,"require_deposit":true}'::jsonb,
   'booking', 'Booking Rules', 'Rules enforced during reservation creation.'),
  ('cancellation_policy',
   '{"free_cancellation_hours":48,"late_cancellation_fee_percent":25,"no_show_fee_percent":100}'::jsonb,
   'booking', 'Cancellation Policy', 'Fees applied to late cancellations and no-shows.')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- ADD-ONS
-- ----------------------------------------------------------------------------
insert into add_ons (name, description, price, price_type, category, sort_order) values
  ('Child Safety Seat', 'Forward/rear-facing seat for children.', 12.00, 'per_day', 'safety', 1),
  ('Additional Driver', 'Add an extra authorized driver to the agreement.', 15.00, 'per_day', 'driver', 2),
  ('Delivery & Pickup', 'We deliver and collect the vehicle at your location.', 75.00, 'per_rental', 'convenience', 3),
  ('Prepaid Fuel / Charge', 'Return the vehicle without refueling or recharging.', 65.00, 'per_rental', 'fuel', 4),
  ('Toll Transponder', 'Electronic toll pass for hassle-free travel.', 12.00, 'per_day', 'convenience', 5),
  ('Roadside Plus', '24/7 premium roadside assistance coverage.', 9.00, 'per_day', 'protection', 6);

-- ----------------------------------------------------------------------------
-- FEES
-- ----------------------------------------------------------------------------
insert into fees (name, description, amount, fee_type, category, is_taxable) values
  ('Cleaning Fee', 'Excessive cleaning required on return.', 150.00, 'fixed', 'condition', true),
  ('Smoking Fee', 'Evidence of smoking in the vehicle.', 350.00, 'fixed', 'condition', false),
  ('Refueling Service', 'Vehicle returned below fuel level.', 75.00, 'fixed', 'fuel', true),
  ('Young Driver Surcharge', 'Driver under 25 years of age.', 25.00, 'fixed', 'driver', true),
  ('After-Hours Service', 'Pickup or return outside business hours.', 50.00, 'fixed', 'convenience', true),
  ('Insurance Pass-Through', 'Daily liability protection (insurance rentals).', 28.00, 'fixed', 'insurance', false);

-- ----------------------------------------------------------------------------
-- AGREEMENT TEMPLATE — default rental agreement
-- ----------------------------------------------------------------------------
insert into agreement_templates (name, description, is_default, is_active, sections) values
  ('Standard Rental Agreement', 'Default agreement used for all rentals.', true, true,
   '[
     {"title":"Rental Terms","body":"The renter agrees to rent the described vehicle for the period stated in this agreement. The vehicle must be returned in the same condition, on the agreed date and time, to the agreed location."},
     {"title":"Deposit Policy","body":"A refundable security deposit is authorized on the renter''s card at check-out. The deposit is released after the vehicle is returned and inspected, provided there is no damage, no outstanding fees, and no policy violations."},
     {"title":"Mileage Policy","body":"Each rental includes a daily mileage allowance. Excess mileage is billed at the per-mile rate stated for the vehicle. Unlimited-mileage rentals are noted on the reservation."},
     {"title":"Fuel & Charging Policy","body":"The vehicle must be returned with the same fuel or battery level as at check-out. Otherwise a refueling/recharging service fee plus the cost of fuel or charging will apply."},
     {"title":"Late Return Policy","body":"A grace period of 59 minutes applies. Beyond that, late returns are billed at the hourly late fee, up to a full additional day. Extensions must be approved in advance."},
     {"title":"Damage Policy","body":"The renter is responsible for any damage to the vehicle during the rental period. Damage is documented with photos at check-out and check-in. Repair costs may be charged to the renter or deposit."},
     {"title":"Smoking Policy","body":"Smoking and vaping are strictly prohibited in all vehicles. A smoking fee applies if evidence is found."},
     {"title":"Tolls & Traffic Violations","body":"The renter is responsible for all tolls, parking tickets, traffic citations and related administrative fees incurred during the rental period."},
     {"title":"Insurance Requirement","body":"The renter must maintain valid auto insurance covering the rental, or purchase the company''s liability protection. Proof of insurance is required at check-out."},
     {"title":"Authorization to Charge Card","body":"The renter authorizes Car Mart Rentals to charge the card on file for rental charges, approved add-ons, fuel, mileage, tolls, fines, cleaning, damage and any other fees arising under this agreement."}
   ]'::jsonb);

-- ----------------------------------------------------------------------------
-- EMAIL TEMPLATES
-- ----------------------------------------------------------------------------
insert into email_templates (key, name, subject, body_html, variables) values
  ('booking_confirmation', 'Booking Confirmation', 'Your Car Mart Rentals booking {{reservation_number}} is confirmed',
   '<p>Hi {{customer_name}},</p><p>Your reservation for the {{vehicle_name}} is confirmed.</p><p>Pickup: {{pickup_at}}<br/>Return: {{return_at}}</p><p>Total: {{total}}</p>',
   '["customer_name","reservation_number","vehicle_name","pickup_at","return_at","total"]'::jsonb),
  ('payment_receipt', 'Payment Receipt', 'Receipt for your payment to Car Mart Rentals',
   '<p>Hi {{customer_name}},</p><p>We received your payment of {{amount}} for reservation {{reservation_number}}.</p>',
   '["customer_name","amount","reservation_number"]'::jsonb),
  ('pickup_reminder', 'Pickup Reminder', 'Reminder: your rental pickup is tomorrow',
   '<p>Hi {{customer_name}},</p><p>This is a reminder that your {{vehicle_name}} pickup is scheduled for {{pickup_at}}.</p>',
   '["customer_name","vehicle_name","pickup_at"]'::jsonb);

-- ----------------------------------------------------------------------------
-- VEHICLES — Car Mart Rentals fleet
-- ----------------------------------------------------------------------------
insert into vehicles
  (slug, vin, year, make, model, trim, license_plate, color, category, seats, doors,
   fuel_type, transmission, odometer, daily_rate, weekly_rate, monthly_rate, weekend_rate,
   security_deposit, mileage_limit, extra_mileage_fee, cleaning_fee, late_fee, smoking_fee,
   fuel_policy, status, main_image_url, features, description, is_featured,
   registration_expiration, insurance_expiration)
values
  ('2025-mercedes-amg-gle-53-coupe', '4JGFD6BB1RA000001', 2025, 'Mercedes-AMG', 'GLE 53', 'Coupe',
   'CMR-A001', 'Obsidian Black', 'luxury', 5, 4, 'gasoline', 'automatic', 4200,
   349, 2100, 7500, 399, 1500, 200, 0.85, 200, 35, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80',
   '{"AMG Performance","Panoramic Roof","Burmester Audio","Heated & Ventilated Seats","360 Camera","Apple CarPlay","Adaptive Cruise"}',
   'The Mercedes-AMG GLE 53 Coupe blends commanding SUV presence with genuine AMG performance. A handcrafted interior, turbocharged inline-six and signature styling make it the standout of our luxury fleet.',
   true, '2026-09-30', '2026-06-30'),

  ('2022-mercedes-benz-s500', 'W1K6G7GB0NA000002', 2022, 'Mercedes-Benz', 'S500', '4MATIC',
   'CMR-A002', 'Diamond White', 'luxury', 5, 4, 'gasoline', 'automatic', 18900,
   399, 2400, 8500, 449, 2000, 200, 0.95, 200, 40, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=1400&q=80',
   '{"Executive Rear Seats","Burmester 4D Sound","Massage Seats","Augmented Reality Nav","Heads-Up Display","Soft-Close Doors"}',
   'The flagship Mercedes-Benz S500 is the definition of executive luxury. Whisper-quiet, effortlessly powerful, and trimmed in the finest materials — ideal for weddings, executives and special occasions.',
   true, '2026-08-31', '2026-06-30'),

  ('2023-ford-mustang-gt', '1FA6P8CF0P5000003', 2023, 'Ford', 'Mustang', 'GT Premium',
   'CMR-S003', 'Race Red', 'sports', 4, 2, 'gasoline', 'automatic', 12400,
   199, 1150, 4200, 249, 1000, 200, 0.65, 175, 30, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=1400&q=80',
   '{"5.0L V8","Active Exhaust","Brembo Brakes","Recaro Seats","Track Apps","B&O Audio"}',
   'An American icon. The Ford Mustang GT delivers a thunderous 5.0L V8, head-turning looks and a driving experience built for the open road.',
   true, '2026-07-31', '2026-06-30'),

  ('2022-toyota-prius', 'JTDKARFU0N3000004', 2022, 'Toyota', 'Prius', 'XLE',
   'CMR-E004', 'Silver Metallic', 'economy', 5, 4, 'hybrid', 'automatic', 26700,
   65, 380, 1400, 75, 300, 250, 0.35, 125, 20, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=1400&q=80',
   '{"54 MPG","Apple CarPlay","Lane Assist","Adaptive Cruise","Backup Camera"}',
   'Exceptional fuel economy and rock-solid reliability. The Toyota Prius is the smart choice for budget-conscious travel and long-distance trips.',
   false, '2026-10-31', '2026-06-30'),

  ('2025-toyota-camry', '4T1G11AK0SU000005', 2025, 'Toyota', 'Camry', 'SE',
   'CMR-D005', 'Midnight Black', 'sedan', 5, 4, 'hybrid', 'automatic', 3100,
   79, 460, 1700, 89, 350, 250, 0.35, 125, 22, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1400&q=80',
   '{"Hybrid Powertrain","Wireless CarPlay","Toyota Safety Sense","Dual-Zone Climate","Sport Mode"}',
   'The all-new 2025 Toyota Camry pairs a refined hybrid powertrain with a sharp, modern cabin. Comfortable, efficient and dependable for any trip.',
   false, '2026-12-31', '2026-06-30'),

  ('2026-honda-cr-v', '7FARW2H50TE000006', 2026, 'Honda', 'CR-V', 'EX-L',
   'CMR-V006', 'Platinum Gray', 'suv', 5, 4, 'gasoline', 'automatic', 1500,
   95, 560, 2100, 109, 400, 250, 0.40, 150, 25, 350,
   'Return with same fuel level', 'available',
   'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1400&q=80',
   '{"Spacious Cargo","Heated Leather Seats","Honda Sensing","Power Liftgate","Apple CarPlay","All-Wheel Drive"}',
   'The 2026 Honda CR-V is the perfect family and adventure SUV — roomy, efficient and packed with safety technology.',
   true, '2027-02-28', '2026-06-30'),

  ('2022-tesla-model-y', '7SAYGDEE0NF000007', 2022, 'Tesla', 'Model Y', 'Long Range',
   'CMR-E007', 'Pearl White', 'electric', 5, 4, 'electric', 'automatic', 21300,
   129, 750, 2800, 149, 500, 250, 0.45, 150, 25, 350,
   'Return with same battery level', 'available',
   'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=80',
   '{"330 mi Range","Autopilot","Glass Roof","Supercharging","15in Touchscreen","Premium Audio"}',
   'Go electric with the Tesla Model Y Long Range. Instant torque, a minimalist cabin and access to the Supercharger network make every drive effortless.',
   true, '2026-11-30', '2026-06-30');

-- ----------------------------------------------------------------------------
-- VEHICLE GALLERY IMAGES
-- ----------------------------------------------------------------------------
insert into vehicle_images (vehicle_id, url, is_primary, sort_order)
select v.id, v.main_image_url, true, 0 from vehicles v;

insert into vehicle_images (vehicle_id, url, is_primary, sort_order)
select v.id, img.url, false, img.ord
from vehicles v
cross join lateral (values
  ('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80', 1),
  ('https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80', 2),
  ('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80', 3)
) as img(url, ord);
