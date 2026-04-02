-- Let authenticated users read counselor rows (for appointment booking / directory).
-- OR-combines with existing self-select policy.

drop policy if exists "profiles_counselor_directory_select" on public.profiles;
create policy "profiles_counselor_directory_select"
on public.profiles
for select
using (
  auth.uid() is not null
  and role = 'counselor'
);
