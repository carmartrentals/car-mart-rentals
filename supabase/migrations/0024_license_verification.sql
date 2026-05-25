-- ============================================================================
-- 0024 — Enhanced driver-license verification
--
-- Layers on top of the existing dl_status / dl_verified_at fields:
--   - AI inspection result (authenticity signals from photo analysis)
--   - DMV/MVR check (manual or via 3rd-party API)
--   - Final risk score combining all signals
-- ============================================================================

alter table customers
  -- AI inspection of the uploaded DL photo
  add column if not exists dl_ai_check_at        timestamptz,
  add column if not exists dl_ai_check_score     integer,   -- 0-100, higher = looks more authentic
  add column if not exists dl_ai_check_flags     jsonb,     -- ["age_under_21", "name_mismatch", ...]
  add column if not exists dl_ai_check_summary   text,

  -- Real DMV / MVR check (manual today, real-time API tomorrow)
  add column if not exists dl_dmv_check_at       timestamptz,
  add column if not exists dl_dmv_check_status   text,      -- valid | suspended | revoked | expired | unknown
  add column if not exists dl_dmv_check_provider text,      -- 'manual' | 'checkr' | 'sambasafety' | ...
  add column if not exists dl_dmv_check_notes    text,
  add column if not exists dl_dmv_check_data     jsonb,     -- full provider response

  -- Aggregate risk
  add column if not exists license_risk_level    text;      -- low | medium | high | block
