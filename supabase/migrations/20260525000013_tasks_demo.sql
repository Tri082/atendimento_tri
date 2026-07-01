create type public.task_status as enum ('pending', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'pending',
  priority public.task_priority not null default 'medium',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_organization_id_idx on public.tasks(organization_id);
create index tasks_status_idx on public.tasks(status);
create index tasks_assigned_to_idx on public.tasks(assigned_to);

alter table public.tasks enable row level security;

create policy "members read tasks"
  on public.tasks for select
  using (public.is_org_member(organization_id));

create policy "members insert tasks"
  on public.tasks for insert
  with check (public.is_org_member(organization_id) and auth.uid() = created_by);

create policy "members update tasks"
  on public.tasks for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "admins delete tasks"
  on public.tasks for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
