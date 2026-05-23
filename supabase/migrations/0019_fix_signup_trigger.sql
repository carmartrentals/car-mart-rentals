-- ============================================================================
-- 0019 — Fix customer sign-ups that use a single-word "Full Name"
--
-- The original trigger built last_name with a NULLIF that returned NULL when
-- the full name had no space ("Radik"). Inserting NULL into customers.last_name
-- (a NOT NULL column) aborted the auth user creation and surfaced as the
-- generic "Database error saving new user" message in the portal.
--
-- This rewrite splits the name on any whitespace, defaults first_name to
-- "Customer" if empty, and uses an empty string for last_name when the user
-- only provided one word.
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  acct_type text := coalesce(new.raw_user_meta_data->>'account_type', 'staff');
  full_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  parts   text[];
  first_n text;
  last_n  text;
  linked  int;
begin
  parts := regexp_split_to_array(trim(full_name), '\s+');
  first_n := coalesce(nullif(parts[1], ''), 'Customer');
  last_n  := coalesce(array_to_string(parts[2:array_length(parts, 1)], ' '), '');

  if acct_type = 'customer' then
    update public.customers
       set user_id = new.id
     where lower(email) = lower(new.email)
       and user_id is null;
    get diagnostics linked = row_count;

    if linked = 0 then
      insert into public.customers (user_id, first_name, last_name, email)
      values (new.id, first_n, last_n, new.email);
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
