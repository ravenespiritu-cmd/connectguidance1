-- STABLE + "set local row_security" in the function body triggers:
--   SET is not allowed in a non-volatile function
-- Use VOLATILE and function-level SET row_security = off instead of SET LOCAL.

create or replace function public.is_admin()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
set row_security = off
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'admin' then
    return true;
  end if;
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
volatile
security definer
set search_path = public
set row_security = off
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'receptionist' then
    return true;
  end if;
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

create or replace function public.profile_role_for(user_id uuid)
returns public.app_role
language sql
volatile
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = user_id limit 1;
$$;

grant execute on function public.profile_role_for(uuid) to authenticated;
grant execute on function public.profile_role_for(uuid) to service_role;
