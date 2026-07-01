create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraint do slug (slug-friendly, 3-40 chars, lowercase, hifens)
alter table public.organizations
  add constraint organizations_slug_format
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$');

create index organizations_created_by_idx on public.organizations(created_by);

alter table public.organizations enable row level security;
-- Policies em 20260525000006 (depende dos helpers RLS)
