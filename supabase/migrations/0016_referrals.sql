-- ============================================================================
-- 0016 — Customer referral program
-- Each customer gets a shareable referral code; referrals are logged when a
-- new customer books with that code.
-- ============================================================================

alter table customers
  add column if not exists referral_code text;

-- Give existing customers a code.
update customers
  set referral_code = upper(substr(md5(id::text || random()::text), 1, 8))
  where referral_code is null;

create unique index if not exists idx_customers_referral_code
  on customers(referral_code)
  where referral_code is not null;

create table if not exists referrals (
  id                   uuid primary key default gen_random_uuid(),
  referrer_id          uuid references customers(id) on delete set null,
  referred_customer_id uuid references customers(id) on delete set null,
  referred_name        text,
  reservation_id       uuid references reservations(id) on delete set null,
  status               text not null default 'pending',
  created_at           timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on referrals(referrer_id);

alter table referrals enable row level security;
