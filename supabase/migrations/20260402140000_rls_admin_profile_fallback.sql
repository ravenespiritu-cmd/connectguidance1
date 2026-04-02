-- Allow admin bypass when JWT contains role=admin OR profiles.role=admin (so environments without custom JWT claims still work).

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    );
$$;
