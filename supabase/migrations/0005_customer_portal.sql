-- ============================================================================
-- Car Mart Rentals — Customer portal accounts
-- Migration 0005
--
-- Customer-portal sign-ups must NOT become staff users. The signup passes
-- account_type = 'customer' in metadata; this trigger then links (or creates)
-- a row in public.customers instead of public.users.
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  acct_type text := coalesce(new.raw_user_meta_data->>'account_type', 'staff');
  full_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  linked    int;
begin
  if acct_type = 'customer' then
    -- Link an existing customer record by email, else create one.
    update public.customers
       set user_id = new.id
     where lower(email) = lower(new.email)
       and user_id is null;
    get diagnostics linked = row_count;

    if linked = 0 then
      insert into public.customers (user_id, first_name, last_name, email)
      values (
        new.id,
        split_part(full_name, ' ', 1),
        nullif(substring(full_name from position(' ' in full_name) + 1), full_name),
        new.email
      );
    end if;
    return new;
  end if;

  -- Staff account — create an admin/staff profile.
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    full_name,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Allow a signed-in customer to update their own customer record
-- (document uploads, profile edits from the portal).
drop policy if exists "customer updates own record" on customers;
create policy "customer updates own record" on customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
