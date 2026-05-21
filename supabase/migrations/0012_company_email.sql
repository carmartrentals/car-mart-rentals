-- ============================================================================
-- Car Mart Rentals
-- Migration 0012: Set the company contact email to contact@carmartrentals.com
-- ============================================================================

-- Company profile shown across the website, documents and emails.
update settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{email}',
  '"contact@carmartrentals.com"'
)
where key = 'company_profile';

-- Any rental location still using the previous address.
update locations
set email = 'contact@carmartrentals.com'
where email = 'reservations@carmartrentals.com';
