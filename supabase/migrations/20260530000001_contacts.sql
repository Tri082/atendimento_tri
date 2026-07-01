-- Enum for pipeline stages. Order matters for UI (defines column order in Kanban).
create type public.contact_stage as enum (
  'lead',
  'contact_made',
  'meeting_scheduled',
  'meeting_done',
  'proposal',
  'active_client',
  'inactive'
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  stage public.contact_stage not null default 'lead',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_organization_id_idx on public.contacts(organization_id);
create index contacts_stage_idx on public.contacts(stage);

-- ENABLE (not FORCE — FORCE causes infinite recursion with SECURITY DEFINER helpers).
alter table public.contacts enable row level security;

create policy "members read contacts"
  on public.contacts for select
  using (public.is_org_member(organization_id));

create policy "members insert contacts"
  on public.contacts for insert
  with check (public.is_org_member(organization_id) and auth.uid() = created_by);

create policy "members update contacts"
  on public.contacts for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "admins delete contacts"
  on public.contacts for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

-- Reuse existing set_updated_at trigger function (defined in earlier migration).
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();
