-- Sensitive change audit: `case_notes` and `profiles` (INSERT, UPDATE, DELETE).
-- Stores actor, TG_OP, table name, record id, and old/new row payloads as JSONB.

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
    tg_table_name::text,
    coalesce(new.id, old.id),
    jsonb_build_object(
      'old', to_jsonb(old),
      'new', to_jsonb(new)
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_case_notes_changes on public.case_notes;
create trigger trg_audit_case_notes_changes
after insert or update or delete on public.case_notes
for each row
execute function public.log_sensitive_changes();

drop trigger if exists trg_audit_profiles_changes on public.profiles;
create trigger trg_audit_profiles_changes
after insert or update or delete on public.profiles
for each row
execute function public.log_sensitive_changes();
