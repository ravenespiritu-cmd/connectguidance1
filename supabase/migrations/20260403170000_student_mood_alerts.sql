-- Student mood check-ins: when a student reports low mood, counselors they've met via
-- appointments can see an in-app alert (no email in v1).

create table if not exists public.student_mood_alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  counselor_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint student_mood_alerts_note_len check (note is null or char_length(note) <= 500)
);

create index if not exists idx_student_mood_alerts_counselor_created
  on public.student_mood_alerts (counselor_id, created_at desc);

create index if not exists idx_student_mood_alerts_student_created
  on public.student_mood_alerts (student_id, created_at desc);

alter table public.student_mood_alerts enable row level security;

drop policy if exists "student_mood_alerts_admin_all" on public.student_mood_alerts;
create policy "student_mood_alerts_admin_all"
on public.student_mood_alerts
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student_mood_alerts_student_insert" on public.student_mood_alerts;
create policy "student_mood_alerts_student_insert"
on public.student_mood_alerts
for insert
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.appointments a
    where a.student_id = auth.uid()
      and a.counselor_id = counselor_id
      and a.status <> 'cancelled'::public.appointment_status
  )
);

drop policy if exists "student_mood_alerts_student_select" on public.student_mood_alerts;
create policy "student_mood_alerts_student_select"
on public.student_mood_alerts
for select
using (student_id = auth.uid());

drop policy if exists "student_mood_alerts_counselor_select" on public.student_mood_alerts;
create policy "student_mood_alerts_counselor_select"
on public.student_mood_alerts
for select
using (counselor_id = auth.uid());

grant select on table public.student_mood_alerts to authenticated;
grant insert on table public.student_mood_alerts to authenticated;
