-- ============================================================================
-- 0013 — Driver-license & insurance verification system
-- Adds per-document verification status, rejection reasons, expiry tracking,
-- a verification method (manual or Stripe Identity), and a per-reservation
-- flag for whether proof of insurance is required for that rental.
-- ============================================================================

-- --- Customers: per-document verification ----------------------------------
alter table customers
  add column if not exists dl_status                      text not null default 'not_submitted',
  add column if not exists insurance_status               text not null default 'not_submitted',
  add column if not exists dl_rejection_reason            text,
  add column if not exists insurance_rejection_reason     text,
  add column if not exists dl_verified_at                 timestamptz,
  add column if not exists insurance_verified_at          timestamptz,
  add column if not exists insurance_expiration           date,
  add column if not exists dl_verification_method         text,
  add column if not exists stripe_verification_session_id text;

do $$ begin
  alter table customers add constraint customers_dl_status_check
    check (dl_status in ('not_submitted','pending','verified','rejected'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table customers add constraint customers_insurance_status_check
    check (insurance_status in ('not_submitted','pending','verified','rejected'));
exception when duplicate_object then null;
end $$;

-- --- Reservations: is proof of insurance required for this rental? ----------
alter table reservations
  add column if not exists insurance_required boolean not null default false;

-- --- Backfill existing records ---------------------------------------------
-- Customers already marked verified keep verified status for both documents.
update customers
  set dl_status             = 'verified',
      insurance_status      = 'verified',
      dl_verified_at        = coalesce(dl_verified_at, now()),
      insurance_verified_at = coalesce(insurance_verified_at, now())
  where documents_verified = true;

-- Customers with uploads but not yet verified become "pending review".
update customers
  set dl_status = 'pending'
  where documents_verified = false
    and dl_status = 'not_submitted'
    and (dl_front_url is not null or dl_back_url is not null);

update customers
  set insurance_status = 'pending'
  where documents_verified = false
    and insurance_status = 'not_submitted'
    and insurance_doc_url is not null;
