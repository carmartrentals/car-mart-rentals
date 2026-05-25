-- ============================================================================
-- 0026 — AI Realtime receptionist support
--
-- Adds per-call audio-token columns so the OpenAI Realtime API path can
-- compute cost the same way the legacy Polly + chat path does. The settings
-- table already supports the new ai_voice_mode/ai_voice_name keys via its
-- generic key/value JSONB schema — no schema change there.
-- ============================================================================

alter table call_logs
  add column if not exists realtime_input_audio_tokens  integer not null default 0,
  add column if not exists realtime_output_audio_tokens integer not null default 0,
  add column if not exists realtime_input_text_tokens   integer not null default 0,
  add column if not exists realtime_output_text_tokens  integer not null default 0,
  -- Which voice path served this call — "polly" (legacy) or "realtime".
  -- Useful for cost analysis and gradual rollout.
  add column if not exists voice_mode                   text;

-- Seed sensible default voice settings so the admin Settings page renders
-- without first-run nulls. Existing rows are not overwritten.
insert into settings (key, value)
values
  ('ai_voice', '{"mode": "polly", "voice": "Polly.Joanna-Neural", "realtime_voice": "coral"}'::jsonb)
on conflict (key) do nothing;
