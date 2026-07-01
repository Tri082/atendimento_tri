-- Sub-H Round-2 #2: automation_runs e automation_run_steps SELECT viram admin-only
-- (era is_org_member; UI já foi pra admin-only no H-8, mas Realtime/REST direto vazava
-- payloads sensíveis pra member não-admin)

drop policy "automation_runs: members read" on public.automation_runs;

create policy "automation_runs: admins read"
  on public.automation_runs for select
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

drop policy "automation_run_steps: members read" on public.automation_run_steps;

create policy "automation_run_steps: admins read" on public.automation_run_steps for select
  using (exists (
    select 1 from public.automation_runs r
    where r.id = run_id
      and public.has_org_role(r.organization_id, array['owner','admin']::public.org_role[])
  ));
