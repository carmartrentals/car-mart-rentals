-- ============================================================================
-- 0020 — AI Phone Receptionist call log
-- Every inbound call to the Twilio number gets a row here with the full
-- conversation transcript, recording URL, AI summary and extracted intent.
-- ============================================================================

create table if not exists call_logs (
  id              uuid primary key default gen_random_uuid(),
  -- Twilio's unique Call SID — also used to look up the row from each
  -- inbound voice webhook turn so we can append to the conversation.
  call_sid        text not null unique,
  from_number     text,
  to_number       text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_seconds int,
  -- Lifecycle status: initiated, ringing, in-progress, completed, busy,
  -- no-answer, failed, canceled. Twilio's status callbacks update this.
  status          text not null default 'initiated',
  -- Full conversation as an array of { role: "assistant"|"user", content, at }
  transcript      jsonb not null default '[]'::jsonb,
  -- Twilio call recording URL (if recording is enabled on the number).
  recording_url   text,
  -- AI-generated post-call summary (3-4 sentences) for admin scanning.
  ai_summary      text,
  -- Inferred caller intent: "booking", "pricing_question", "complaint",
  -- "support", "general", etc. Used in the admin list filter.
  customer_intent text,
  -- Caller's name if the AI extracted it from conversation.
  caller_name     text,
  -- Was the call transferred to a human at some point?
  transferred     boolean not null default false,
  -- Did the AI send a booking-link SMS during the call?
  sms_sent        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_call_logs_started on call_logs(started_at desc);
create index if not exists idx_call_logs_status on call_logs(status);
create index if not exists idx_call_logs_from on call_logs(from_number);

alter table call_logs enable row level security;
