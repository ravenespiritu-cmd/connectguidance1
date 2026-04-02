-- One-time repair: create profiles for auth users who have none (e.g. signed up before the trigger).
-- Run in Supabase SQL Editor as postgres.

insert into public.profiles (id, role, full_name, student_id, department)
select
  u.id,
  'student'::public.app_role,
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  nullif(trim(u.raw_user_meta_data->>'student_id'), ''),
  nullif(trim(u.raw_user_meta_data->>'department'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
