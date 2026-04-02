-- Infinite recursion on profiles: admin/receptionist policies call is_admin()/is_receptionist(),
-- whose EXISTS subqueries read profiles under the same RLS rules → loop.
-- Disable row_security inside these helpers so the lookup does not re-enter policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

create or replace function public.is_receptionist()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'receptionist'
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'receptionist'
    );
$$;

grant execute on function public.is_receptionist() to authenticated;
grant execute on function public.is_receptionist() to service_role;
