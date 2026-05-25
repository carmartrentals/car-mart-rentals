-- ============================================================================
-- 0029 — Marketing v2: audience segments, resend-to-non-openers, birthdays
--
-- Adds:
--   1) audience field on marketing_campaigns so the operator can target
--      VIPs, active or lapsed customers, or resend a campaign only to the
--      people who didn't open the previous send.
--   2) resend_of_campaign_id link so resends point back to their original.
--   3) last_birthday_email_year on customers to dedupe the birthday auto-
--      send (the cron in 0030 will use it).
-- ============================================================================

alter table marketing_campaigns
  add column if not exists audience text not null default 'all',
    -- all | vip | active_90d | lapsed_90d | non_openers
  add column if not exists resend_of_campaign_id uuid
    references marketing_campaigns(id) on delete set null;

create index if not exists idx_marketing_campaigns_resend_of
  on marketing_campaigns(resend_of_campaign_id);

-- Customer-level dedupe for the birthday-greeting cron. Resets each year.
alter table customers
  add column if not exists last_birthday_email_year integer;
