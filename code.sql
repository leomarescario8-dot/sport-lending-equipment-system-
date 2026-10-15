
alter table app_users
  add column if not exists role text not null default 'admin' check (role in ('admin', 'user'));

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

