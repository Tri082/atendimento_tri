create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_organization_id_idx on public.companies(organization_id);

alter table public.companies enable row level security;

create policy "members read companies"
  on public.companies for select
  using (public.is_org_member(organization_id));

create policy "members insert companies"
  on public.companies for insert
  with check (public.is_org_member(organization_id) and auth.uid() = created_by);

create policy "members update companies"
  on public.companies for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "admins delete companies"
  on public.companies for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();
