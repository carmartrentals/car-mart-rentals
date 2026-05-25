-- ============================================================================
-- 0025 — AI inspection columns for proof-of-insurance documents
--
-- Mirrors the dl_ai_check_* columns added in 0024 — gives the insurance
-- verification card the same authenticity score + flags + summary surface
-- that the driver-license card already shows.
-- ============================================================================

alter table customers
  add column if not exists insurance_ai_check_at      timestamptz,
  add column if not exists insurance_ai_check_score   integer,
  add column if not exists insurance_ai_check_flags   jsonb,
  add column if not exists insurance_ai_check_summary text,
  add column if not exists insurance_risk_level       text;
