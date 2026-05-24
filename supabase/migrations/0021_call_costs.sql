-- ============================================================================
-- 0021 — Per-call cost tracking for the AI receptionist
--
-- Tracks the components of each call's cost so the admin panel can show
-- "This call cost $0.14" and "This month: $42.30 across 312 calls" without
-- needing the operator to log into Twilio + OpenAI dashboards.
-- ============================================================================

alter table call_logs
  add column if not exists prompt_tokens     integer not null default 0,
  add column if not exists completion_tokens integer not null default 0,
  add column if not exists twilio_voice_cost  numeric(10,4),
  add column if not exists twilio_speech_cost numeric(10,4),
  add column if not exists openai_cost        numeric(10,4),
  add column if not exists total_cost         numeric(10,4);

create index if not exists idx_call_logs_started_cost
  on call_logs(started_at desc);
