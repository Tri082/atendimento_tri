-- Sub-H: adiciona status 'skipped_payload_too_large' pra eventos descartados por tamanho
alter table public.automation_runs
  drop constraint automation_runs_status_check;

alter table public.automation_runs
  add constraint automation_runs_status_check
  check (status in (
    'pending', 'running', 'completed', 'failed',
    'skipped_conditions', 'skipped_recursion', 'skipped_queue_full',
    'skipped_payload_too_large'
  ));
