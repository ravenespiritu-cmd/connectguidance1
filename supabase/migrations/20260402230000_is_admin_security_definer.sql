-- is_admin() reads public.profiles to support admins without a custom JWT claim.
-- That subquery must bypass RLS; otherwise policy evaluation can fail and admins
-- only "see" their own profile row (student counts and user lists look empty).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
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
