-- ============================================================================
-- 0018 — Rate limiting
-- Tracks recent requests to public endpoints (chat, booking) so abusive
-- bursts can be throttled and pay-per-use AI costs stay protected.
-- ============================================================================

create table if not exists rate_limit_hits (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_hits
  on rate_limit_hits(bucket, created_at);

alter table rate_limit_hits enable row level security;
