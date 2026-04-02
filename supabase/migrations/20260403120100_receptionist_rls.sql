-- Receptionist: list students, read schedules, book appointments on behalf of students.

create or replace function public.is_receptionist()
returns boolean
language sql
stable
security definer
set search_path = public
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

drop policy if exists "profiles_receptionist_student_select" on public.profiles;
create policy "profiles_receptionist_student_select"
on public.profiles
for select
using (
  public.is_receptionist()
  and role = 'student'
);

drop policy if exists "appointments_receptionist_select" on public.appointments;
create policy "appointments_receptionist_select"
on public.appointments
for select
using (public.is_receptionist());

drop policy if exists "appointments_receptionist_insert" on public.appointments;
create policy "appointments_receptionist_insert"
on public.appointments
for insert
with check (
  public.is_receptionist()
  and exists (
    select 1 from public.profiles s
    where s.id = appointments.student_id and s.role = 'student' and coalesce(s.is_active, true)
  )
  and exists (
    select 1 from public.profiles c
    where c.id = appointments.counselor_id and c.role = 'counselor' and coalesce(c.is_active, true)
  )
);
