-- ============================================================================
-- 0015 — Digital pre-check-in
-- Lets a customer review documents, sign the rental agreement and settle
-- their balance online before pickup, for a fast in-person handover.
-- ============================================================================

alter table reservations
  add column if not exists precheckin_completed_at  timestamptz,
  add column if not exists precheckin_signature_url text;
