-- Run this entire file once in Supabase Dashboard → SQL Editor (or use migrations individually).


-- === 20260401123000_init_guidanceconnect.sql ===

-- GuidanceConnect initial schema + RLS + audit triggers
-- NOTE: This migration assumes JWT custom claim "role" is present.

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'counselor', 'student');
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
  end if;
end
$$;

-- Helper functions for RLS
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.jwt_role() = 'admin';
$$;

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text not null,
  student_id text,
  department text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  counselor_id uuid not null references public.profiles(id) on delete restrict,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  concern_type text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Case notes (content encrypted at app layer)
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  counselor_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_confidential boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Chatbot sessions
create table if not exists public.chatbot_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_appointments_student_id on public.appointments(student_id);
create index if not exists idx_appointments_counselor_id on public.appointments(counselor_id);
create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);
create index if not exists idx_case_notes_appointment_id on public.case_notes(appointment_id);
create index if not exists idx_case_notes_counselor_id on public.case_notes(counselor_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_chatbot_sessions_student_id on public.chatbot_sessions(student_id);

-- Auto-update timestamp for case_notes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_case_notes_updated_at on public.case_notes;
create trigger trg_case_notes_updated_at
before update on public.case_notes
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.case_notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.chatbot_sessions enable row level security;

-- Profiles policies
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles
for insert
with check (id = auth.uid() and role = 'student');

-- Appointments policies
drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all"
on public.appointments
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "appointments_student_own_all" on public.appointments;
create policy "appointments_student_own_all"
on public.appointments
for all
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists "appointments_counselor_assigned_select" on public.appointments;
create policy "appointments_counselor_assigned_select"
on public.appointments
for select
using (counselor_id = auth.uid());

drop policy if exists "appointments_counselor_assigned_update" on public.appointments;
create policy "appointments_counselor_assigned_update"
on public.appointments
for update
using (counselor_id = auth.uid())
with check (counselor_id = auth.uid());

-- Case notes policies
drop policy if exists "case_notes_admin_all" on public.case_notes;
create policy "case_notes_admin_all"
on public.case_notes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "case_notes_counselor_authored_all" on public.case_notes;
create policy "case_notes_counselor_authored_all"
on public.case_notes
for all
using (counselor_id = auth.uid())
with check (counselor_id = auth.uid());

drop policy if exists "case_notes_student_non_confidential_select" on public.case_notes;
create policy "case_notes_student_non_confidential_select"
on public.case_notes
for select
using (
  not is_confidential
  and exists (
    select 1
    from public.appointments a
    where a.id = case_notes.appointment_id
      and a.student_id = auth.uid()
  )
);

-- Audit logs policies: insert-only for authenticated users, select for admins only
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
on public.audit_logs
for select
using (public.is_admin());

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated"
on public.audit_logs
for insert
with check (auth.uid() is not null and user_id = auth.uid());

-- Chatbot session policies
drop policy if exists "chatbot_sessions_admin_all" on public.chatbot_sessions;
create policy "chatbot_sessions_admin_all"
on public.chatbot_sessions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "chatbot_sessions_student_own_all" on public.chatbot_sessions;
create policy "chatbot_sessions_student_own_all"
on public.chatbot_sessions
for all
using (student_id = auth.uid())
with check (student_id = auth.uid());

-- Audit trigger function: logs sensitive changes on case_notes and profiles
create or replace function public.log_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  insert into public.audit_logs (user_id, action, table_name, record_id, metadata)
  values (
    actor_id,
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    jsonb_build_object(
      'old', to_jsonb(old),
      'new', to_jsonb(new),
      'changed_at', timezone('utc', now())
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_case_notes_changes on public.case_notes;
create trigger trg_audit_case_notes_changes
after insert or update on public.case_notes
for each row execute function public.log_sensitive_changes();

drop trigger if exists trg_audit_profiles_changes on public.profiles;
create trigger trg_audit_profiles_changes
after update on public.profiles
for each row execute function public.log_sensitive_changes();


-- === 20260402140000_rls_admin_profile_fallback.sql ===

-- Allow admin bypass when JWT contains role=admin OR profiles.role=admin (so environments without custom JWT claims still work).

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


-- === 20260402180000_profiles_counselor_directory_select.sql ===

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


-- === 20260402190000_profiles_counselor_sees_assigned_students.sql ===

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


-- === 20260402200000_case_notes_integrity.sql ===

-- One case note per appointment per counselor; enforce counselor matches appointment.

create unique index if not exists idx_case_notes_appointment_counselor
on public.case_notes (appointment_id, counselor_id);

create or replace function public.case_notes_match_appointment_counselor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.appointments a
    where a.id = new.appointment_id
      and a.counselor_id = new.counselor_id
  ) then
    raise exception 'case_notes: counselor_id must match appointments.counselor_id for this appointment_id'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_case_notes_appointment_counselor on public.case_notes;
create trigger trg_case_notes_appointment_counselor
before insert or update on public.case_notes
for each row
execute function public.case_notes_match_appointment_counselor();


-- === 20260402210000_profiles_is_active.sql ===

alter table public.profiles
add column if not exists is_active boolean not null default true;

create index if not exists idx_profiles_is_active on public.profiles(is_active);


-- === 20260402220000_auth_user_profile_trigger.sql ===

-- Profile row must be created without a client JWT when email confirmation is enabled
-- (signUp returns user but no session until the link is clicked â€” RLS would reject inserts).

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text;
  v_student_id text;
  v_department text;
begin
  v_full_name := nullif(trim(coalesce(meta->>'full_name', '')), '');
  v_student_id := nullif(trim(coalesce(meta->>'student_id', '')), '');
  v_department := nullif(trim(coalesce(meta->>'department', '')), '');

  if v_full_name is null or v_full_name = '' then
    v_full_name := split_part(coalesce(new.email, 'user'), '@', 1);
  end if;

  insert into public.profiles (id, role, full_name, student_id, department)
  values (
    new.id,
    'student'::public.app_role,
    v_full_name,
    v_student_id,
    v_department
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();


NOTIFY pgrst, 'reload schema';
