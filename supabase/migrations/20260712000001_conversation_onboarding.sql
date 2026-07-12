create table public.conversation_onboarding (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  current_step      text not null default 'greeting_name',
  is_first_order    boolean,
  answers           jsonb not null default '{}'::jsonb,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (conversation_id)
);

create index conversation_onboarding_org_idx
  on public.conversation_onboarding(organization_id);

create trigger conversation_onboarding_set_updated_at
  before update on public.conversation_onboarding
  for each row execute function public.set_updated_at();

create trigger conversation_onboarding_freeze_org
  before update on public.conversation_onboarding
  for each row execute function public.freeze_messaging_org();

-- RLS — enable (NÃO force, ver regra absoluta em CLAUDE.md raiz).
-- Escrita real acontece via service role (router/onboarding service), que
-- bypassa RLS; as policies abaixo cobrem leitura/gestão manual pela UI/admin.
alter table public.conversation_onboarding enable row level security;

create policy "conversation_onboarding: members read" on public.conversation_onboarding
  for select using (public.is_org_member(organization_id));

create policy "conversation_onboarding: members insert" on public.conversation_onboarding
  for insert with check (public.is_org_member(organization_id));

create policy "conversation_onboarding: members update" on public.conversation_onboarding
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "conversation_onboarding: admins delete" on public.conversation_onboarding
  for delete using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

comment on table public.conversation_onboarding is 'Estado do roteiro de qualificação (primeira mensagem) por conversa. current_step é texto livre (não enum) pra evitar migration de ALTER TYPE a cada novo step.';
