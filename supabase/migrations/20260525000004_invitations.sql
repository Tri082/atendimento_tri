create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index invitations_token_idx on public.invitations(token);
create index invitations_email_idx on public.invitations(email);

alter table public.invitations enable row level security;
-- Policies em 20260525000006
