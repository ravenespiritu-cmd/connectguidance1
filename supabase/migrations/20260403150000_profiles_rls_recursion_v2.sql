-- v2: Some Postgres builds ignore row_security on SQL-backed SECURITY DEFINER helpers.
-- Use PL/pgSQL + SET LOCAL before reading profiles, and fast-path JWT role to skip the read entirely.

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'admin' then
    return true;
  end if;
  set local row_security = off;
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

create or replace function public.is_receptionist()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'receptionist' then
    return true;
  end if;
  set local row_security = off;
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'receptionist'
  );
end;
$$;

grant execute on function public.is_receptionist() to authenticated;
grant execute on function public.is_receptionist() to service_role;

-- Self-update WITH CHECK used to subquery profiles under RLS (another recursion path).
create or replace function public.profile_role_for(user_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = user_id limit 1;
$$;

grant execute on function public.profile_role_for(uuid) to authenticated;
grant execute on function public.profile_role_for(uuid) to service_role;

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role is not distinct from public.profile_role_for(auth.uid())
);
