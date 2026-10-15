-- Run this ONCE in Supabase > SQL Editor (accounts + roles)

-- 1) every existing account becomes an admin; new sign-ups are inserted as 'user'
alter table app_users
  add column if not exists role text not null default 'admin' check (role in ('admin', 'user'));

-- 2) login: returns the role ('admin' or 'user'), or null when the email or password is wrong
create or replace function login_user(p_email text, p_password text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select role from app_users
  where lower(email) = lower(p_email)
    and password_hash = crypt(p_password, password_hash)
  limit 1;
$$;

-- 3) register: creates a 'user' account; returns false when the email is already registered
create or replace function register_user(p_email text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from app_users where lower(email) = lower(p_email)) then
    return false;
  end if;
  insert into app_users (email, password_hash, role)
  values (lower(trim(p_email)), crypt(p_password, gen_salt('bf')), 'user');
  return true;
end;
$$;

revoke all on function login_user(text, text) from public, anon, authenticated;
revoke all on function register_user(text, text) from public, anon, authenticated;
grant execute on function login_user(text, text) to service_role;
grant execute on function register_user(text, text) to service_role;

-- To give someone admin access later:
-- update app_users set role = 'admin' where email = 'name@example.com';
-- To make an admin a normal user:
-- update app_users set role = 'user' where email = 'name@example.com';
