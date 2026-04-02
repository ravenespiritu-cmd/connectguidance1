-- Profile row must be created without a client JWT when email confirmation is enabled
-- (signUp returns user but no session until the link is clicked — RLS would reject inserts).

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
