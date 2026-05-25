-- ============================================================================
-- 0028 — Marketing campaigns with per-recipient open tracking
--
-- Lets the operator send branded promotional emails to all customers (or
-- a filtered audience in a future commit), with per-recipient open tracking
-- via a 1x1 pixel and CAN-SPAM-compliant unsubscribe links.
-- ============================================================================

create table if not exists marketing_campaigns (
  id              uuid primary key default gen_random_uuid(),
  -- Internal name shown in the admin list. Not visible to customers.
  name            text not null,
  -- The email subject line that customers see.
  subject         text not null,
  -- One-line "preheader" that shows in the inbox preview alongside the subject.
  preheader       text,
  -- Marketing body. Plain text or simple HTML — wrapped in the branded
  -- email template at send time so it matches every other transactional email.
  body            text not null,
  -- Optional CTA button rendered prominently at the bottom of the email.
  cta_label       text,
  cta_url         text,
  -- Optional promo code to feature. NULL if the campaign is purely informational.
  promo_code_id   uuid references promo_codes(id) on delete set null,
  status          text not null default 'draft',
    -- draft | sending | sent | failed
  sent_at         timestamptz,
  sent_count      integer not null default 0,
  opened_count    integer not null default 0,
  failed_count    integer not null default 0,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_sent_at
  on marketing_campaigns(sent_at desc);
create index if not exists idx_marketing_campaigns_status
  on marketing_campaigns(status);

create table if not exists marketing_recipients (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references marketing_campaigns(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  email           text not null,
  -- Sent successfully (NULL = pending or failed).
  sent_at         timestamptz,
  -- Tracking: first time the pixel was fetched.
  opened_at       timestamptz,
  -- Number of opens (the same person can open multiple times).
  open_count      integer not null default 0,
  -- Set when the email provider returns a bounce for this address.
  bounced         boolean not null default false,
  -- Error message if the individual send failed.
  send_error      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_marketing_recipients_campaign
  on marketing_recipients(campaign_id);
create index if not exists idx_marketing_recipients_customer
  on marketing_recipients(customer_id);

-- Customer-level marketing opt-out for CAN-SPAM compliance. Once set,
-- the send action skips this customer. Toggled by the unsubscribe link.
alter table customers
  add column if not exists marketing_opted_out boolean not null default false,
  add column if not exists marketing_opted_out_at timestamptz;
