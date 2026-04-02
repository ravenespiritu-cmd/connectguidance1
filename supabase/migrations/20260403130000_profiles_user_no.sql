-- Auto-generated sequential ID per profile (all roles), for support and admin reference.

create sequence if not exists public.profiles_user_no_seq;

alter table public.profiles
  add column if not exists user_no bigint;

update public.profiles p
set user_no = s.n
from (
  select id, row_number() over (order by created_at asc nulls last, id asc) as n
  from public.profiles
  where user_no is null
) s
where p.id = s.id;

select setval(
  'public.profiles_user_no_seq',
  coalesce((select max(user_no) from public.profiles), 0),
  true
);

alter table public.profiles
  alter column user_no set default nextval('public.profiles_user_no_seq');

alter table public.profiles
  alter column user_no set not null;

create unique index if not exists idx_profiles_user_no on public.profiles(user_no);

alter sequence public.profiles_user_no_seq owned by public.profiles.user_no;
