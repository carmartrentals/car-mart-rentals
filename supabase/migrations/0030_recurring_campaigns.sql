-- ============================================================================
-- 0030 — Recurring marketing campaigns
--
-- Lets the operator mark a campaign as "send this same email every N months"
-- e.g. a referral nudge that goes out quarterly. Each automated fire creates
-- a CHILD campaign with its own recipient list + stats so each send is
-- independently trackable.
--
-- The PARENT row carries the recurrence config + next_send_at; the cron
-- picks up parents whose next_send_at <= now, clones them as a one-off
-- child campaign, sends the child, then advances the parent's next_send_at.
-- ============================================================================

alter table marketing_campaigns
  -- 0 = one-off (default). >0 = recurring every N months.
  add column if not exists recurrence_months integer not null default 0,
  -- For recurring rows: when the next automated fire happens.
  add column if not exists next_send_at timestamptz,
  -- Children of a recurring parent point back here. Lets the UI show
  -- "5 sends from this recurring schedule" + the per-send detail.
  add column if not exists recurring_parent_id uuid
    references marketing_campaigns(id) on delete cascade,
  -- True when the row is a recurrence rule rather than a real send.
  -- Parent rows have is_template=true and never themselves count in stats.
  add column if not exists is_template boolean not null default false,
  -- Active toggle on the parent — lets the operator pause a recurring
  -- campaign without deleting it.
  add column if not exists is_active boolean not null default true;

create index if not exists idx_marketing_campaigns_next_send
  on marketing_campaigns(next_send_at)
  where is_template = true and is_active = true;

create index if not exists idx_marketing_campaigns_parent
  on marketing_campaigns(recurring_parent_id);
