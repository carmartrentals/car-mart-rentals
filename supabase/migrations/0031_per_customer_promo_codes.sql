-- ============================================================================
-- 0031 — Per-customer promo codes (security fix for birthday automation)
--
-- The birthday automation previously emailed every customer the SAME static
-- BIRTHDAY15 code, which meant anyone could just type it at checkout to
-- get the discount on a non-birthday. This adds the schema for tying a
-- code to a specific customer so only they can redeem it.
--
-- Same infrastructure also covers future per-customer credit codes
-- (referral bonuses, goodwill credits, "we miss you" comeback codes, etc).
-- ============================================================================

alter table promo_codes
  -- When set, the code is only valid when redeemed by this customer.
  -- Null = open code, anyone can use (the current default behaviour).
  add column if not exists customer_id uuid
    references customers(id) on delete cascade,
  -- True for codes minted by automation (birthday, referral, win-back, etc).
  -- Operator-created codes via /admin/promo-codes stay auto_generated=false
  -- so the list UI can filter them out.
  add column if not exists auto_generated boolean not null default false,
  -- Which automation minted this code — used for reporting + dedupe.
  -- Examples: 'birthday', 'referral_bonus', 'goodwill', 'winback'.
  add column if not exists generated_by_event text;

-- Partial index — most lookups are by code, but when validating we ALSO
-- want a fast "does this customer have a code for this event this year"
-- check during cron runs.
create index if not exists idx_promo_codes_customer_event
  on promo_codes(customer_id, generated_by_event)
  where customer_id is not null;
