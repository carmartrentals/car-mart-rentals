-- ============================================================================
-- 0014 — AI booking risk assessment
-- Stores an AI-generated fraud/loss risk rating for a reservation so staff
-- can see at a glance which bookings to scrutinise before handing over keys.
-- ============================================================================

alter table reservations
  add column if not exists risk_level       text,
  add column if not exists risk_summary     text,
  add column if not exists risk_assessed_at timestamptz;

do $$ begin
  alter table reservations add constraint reservations_risk_level_check
    check (risk_level is null or risk_level in ('low', 'medium', 'high'));
exception when duplicate_object then null;
end $$;
