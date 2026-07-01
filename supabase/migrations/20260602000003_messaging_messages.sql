create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  direction           text not null check (direction in ('inbound','outbound')),
  sender_user_id      uuid references auth.users(id) on delete set null,
  sender_kind         text not null check (sender_kind in ('contact','user','bot','system')),
  body                text,
  media_url           text,
  media_type          text,
  attachments         jsonb not null default '[]'::jsonb,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  status              text not null check (status in ('queued','sending','sent','delivered','read','failed')),
  external_id         text,
  provider_metadata   jsonb not null default '{}'::jsonb,
  failure_reason      text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  unique (conversation_id, external_id)
);

create index messages_conv_created_idx
  on public.messages(conversation_id, created_at desc);

create index messages_pending_idx
  on public.messages(organization_id) where status in ('sending','queued');

create trigger messages_freeze_org
  before update on public.messages
  for each row execute function public.freeze_messaging_org();

alter table public.messages enable row level security;

create policy "messages: members read" on public.messages
  for select using (public.is_org_member(organization_id));

create policy "messages: members insert" on public.messages
  for insert with check (public.is_org_member(organization_id));

create policy "messages: members update" on public.messages
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "messages: admins delete" on public.messages
  for delete using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

comment on table public.messages is 'Mensagens individuais dentro de uma conversation (Sub-projeto A).';
comment on column public.messages.status is 'queued < sending < sent < delivered < read; failed é terminal.';
