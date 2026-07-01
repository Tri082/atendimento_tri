-- FK adicional pra PostgREST conseguir resolver embed memberships → profiles
-- (a FK original aponta pra auth.users, que PostgREST não navega).
alter table public.memberships
  add constraint memberships_user_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
