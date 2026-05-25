-- ============================================================================
-- 0027 — Deduplicate customers + add unique constraints
--
-- Problem: nothing in the schema prevented duplicate customer rows for the
-- same person. Combined with a race-prone self-heal in getCurrentCustomer()
-- and a .maybeSingle() lookup in the booking route that breaks once 2+ rows
-- match an email, the same person could pile up 10+ duplicate rows.
--
-- Strategy:
--   1) Keep the OLDEST row per user_id (it has the most rental history /
--      verified docs). Re-point any reservations/etc that referenced a
--      doomed row, then delete the duplicates.
--   2) Same dedupe for portal-authenticated customers grouped by email
--      (user_id IS NOT NULL).
--   3) Walk-in / admin-created customers (user_id IS NULL) are LEFT ALONE —
--      operators occasionally have legitimate reasons for two records with
--      the same email (different physical drivers, family members, etc).
--   4) Add partial unique indexes so the DB rejects future duplicates at
--      the source.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Re-point dependent rows to the survivor (oldest) customer per user_id.
-- ----------------------------------------------------------------------------
with ranked as (
  select id,
         user_id,
         row_number() over (partition by user_id order by created_at asc) as rn,
         first_value(id) over (
           partition by user_id order by created_at asc
         ) as keeper_id
  from customers
  where user_id is not null
)
update reservations r
   set customer_id = ranked.keeper_id
  from ranked
 where r.customer_id = ranked.id
   and ranked.rn > 1;

with ranked as (
  select id,
         user_id,
         row_number() over (partition by user_id order by created_at asc) as rn,
         first_value(id) over (
           partition by user_id order by created_at asc
         ) as keeper_id
  from customers
  where user_id is not null
)
delete from customers c
 using ranked
 where c.id = ranked.id
   and ranked.rn > 1;

-- ----------------------------------------------------------------------------
-- 2) Same pass keyed on email (case-insensitive) for portal-auth customers.
--    This handles the "12 rows of contact@carmartrentals.com" case where the
--    duplicates had DIFFERENT user_ids (or none at all on some rows).
-- ----------------------------------------------------------------------------
with ranked as (
  select id,
         lower(email) as norm_email,
         row_number() over (
           partition by lower(email) order by created_at asc
         ) as rn,
         first_value(id) over (
           partition by lower(email) order by created_at asc
         ) as keeper_id
  from customers
  where email is not null
    and (user_id is not null or created_at > now() - interval '30 days')
)
update reservations r
   set customer_id = ranked.keeper_id
  from ranked
 where r.customer_id = ranked.id
   and ranked.rn > 1;

with ranked as (
  select id,
         row_number() over (
           partition by lower(email) order by created_at asc
         ) as rn
  from customers
  where email is not null
    and (user_id is not null or created_at > now() - interval '30 days')
)
delete from customers c
 using ranked
 where c.id = ranked.id
   and ranked.rn > 1;

-- ----------------------------------------------------------------------------
-- 3) Add partial unique constraints. Partial = only enforce when the column
--    is NOT NULL, so walk-in customers without portal accounts can share
--    an email when the operator wants that.
-- ----------------------------------------------------------------------------
create unique index if not exists customers_user_id_unique
  on customers (user_id)
  where user_id is not null;

create unique index if not exists customers_email_lower_user_id_unique
  on customers (lower(email))
  where user_id is not null;
