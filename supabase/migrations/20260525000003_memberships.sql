create type public.org_role as enum ('owner', 'admin', 'member');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_org_id_idx on public.memberships(organization_id);

alter table public.memberships enable row level security;
-- Policies em 20260525000006
