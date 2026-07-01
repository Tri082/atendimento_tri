create type public.deal_stage as enum (
  'new',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost'
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  stage public.deal_stage not null default 'new',
  value numeric(12, 2),
  expected_close_date date,
  actual_close_date date,
  lost_reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_organization_id_idx on public.deals(organization_id);
create index deals_company_id_idx on public.deals(company_id);
create index deals_stage_idx on public.deals(stage);

alter table public.deals enable row level security;

create policy "members read deals"
  on public.deals for select
  using (public.is_org_member(organization_id));

create policy "members insert deals"
  on public.deals for insert
  with check (public.is_org_member(organization_id) and auth.uid() = created_by);

create policy "members update deals"
  on public.deals for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "admins delete deals"
  on public.deals for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create or replace function public.set_deal_close_date()
returns trigger
language plpgsql
as $$
begin
  if new.stage in ('won', 'lost') and (old.stage is null or old.stage not in ('won', 'lost')) then
    new.actual_close_date := current_date;
  elsif new.stage not in ('won', 'lost') and old.stage in ('won', 'lost') then
    new.actual_close_date := null;
  end if;
  return new;
end;
$$;

create trigger deals_set_close_date
  before update of stage on public.deals
  for each row execute function public.set_deal_close_date();
