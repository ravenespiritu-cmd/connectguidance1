-- Counselors may read student profiles when they share at least one appointment.

drop policy if exists "profiles_student_visible_to_assigned_counselor" on public.profiles;
create policy "profiles_student_visible_to_assigned_counselor"
on public.profiles
for select
using (
  role = 'student'
  and exists (
    select 1
    from public.appointments a
    where a.student_id = profiles.id
      and a.counselor_id = auth.uid()
  )
);
