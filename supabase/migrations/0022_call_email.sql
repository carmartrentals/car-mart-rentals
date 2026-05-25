-- ============================================================================
-- 0022 — Email-based booking-link delivery for the AI receptionist
--
-- US carriers silently drop SMS from numbers not registered under A2P 10DLC
-- (error 30034). While A2P registration is in progress (1-3 weeks), the AI
-- collects the caller's email mid-conversation and sends the booking link
-- via our existing branded email pipeline (Resend) instead.
-- ============================================================================

alter table call_logs
  add column if not exists email_sent   boolean not null default false,
  add column if not exists caller_email text;
