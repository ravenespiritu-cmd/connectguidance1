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
