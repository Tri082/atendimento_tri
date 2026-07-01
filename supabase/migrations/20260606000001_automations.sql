-- ============================================================
-- automations: definição da automação (1 row por automação)
-- ============================================================
create table public.automations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  trigger_type    text not null,
  trigger_config  jsonb not null default '{}'::jsonb,
  conditions      jsonb not null default '[]'::jsonb,
  actions         jsonb not null default '[]'::jsonb,
  status          text not null default 'draft'
                  check (status in ('draft','active','paused')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_automations_org_trigger
  on public.automations(organization_id, trigger_type)
  where status = 'active';

alter table public.automations enable row level security;

create policy "automations: members read"
  on public.automations for select
  using (public.is_org_member(organization_id));

create policy "automations: admins insert"
  on public.automations for insert
  with check (
    public.has_org_role(organization_id, array['owner','admin']::public.org_role[])
    and auth.uid() = created_by
  );

create policy "automations: admins update"
  on public.automations for update
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

create policy "automations: admins delete"
  on public.automations for delete
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

create trigger trg_automations_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();

-- OBRIGATÓRIO: trigger que congela organization_id e created_by em UPDATEs.
-- Sem isso, admin malicioso pode mudar org_id/created_by da própria linha e
-- vazar dados pra outra org. A função `freeze_org_and_creator` já existe.
create trigger automations_freeze_org_and_creator
  before update on public.automations
  for each row execute function public.freeze_org_and_creator();

-- ============================================================
-- automation_runs: 1 row por execução agendada
-- ============================================================
create table public.automation_runs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  automation_id     uuid not null references public.automations(id) on delete cascade,
  trigger_event_id  text not null,
  trigger_payload   jsonb not null,
  depth             int not null default 0,
  status            text not null default 'pending'
                    check (status in ('pending','running','completed','failed',
                                       'skipped_conditions','skipped_recursion',
                                       'skipped_queue_full')),
  started_at        timestamptz,
  finished_at       timestamptz,
  error             text,
  created_at        timestamptz not null default now(),
  unique (automation_id, trigger_event_id)
);

create index idx_runs_pending
  on public.automation_runs(created_at)
  where status = 'pending';

create index idx_runs_org_created
  on public.automation_runs(organization_id, created_at desc);

alter table public.automation_runs enable row level security;

create policy "automation_runs: members read" on public.automation_runs for select
  using (public.is_org_member(organization_id));

-- ============================================================
-- automation_run_steps: 1 row por ação dentro de uma run
-- ============================================================
create table public.automation_run_steps (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.automation_runs(id) on delete cascade,
  step_index   int not null,
  action_type  text not null,
  input        jsonb not null,
  output       jsonb,
  status       text not null default 'pending'
               check (status in ('pending','running','completed','failed','skipped','dry_run')),
  error        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  unique (run_id, step_index)
);

create index idx_steps_run on public.automation_run_steps(run_id, step_index);

alter table public.automation_run_steps enable row level security;

create policy "automation_run_steps: members read" on public.automation_run_steps for select
  using (exists (
    select 1 from public.automation_runs r
    where r.id = run_id and public.is_org_member(r.organization_id)
  ));

-- ============================================================
-- Realtime publication (pra UI dry-run renderizar ao vivo)
-- ============================================================
alter publication supabase_realtime add table public.automation_runs;
alter publication supabase_realtime add table public.automation_run_steps;
