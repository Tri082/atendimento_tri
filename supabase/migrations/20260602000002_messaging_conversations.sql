create table public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  channel_id         uuid not null references public.channels(id) on delete cascade,
  contact_id         uuid references public.contacts(id) on delete set null,
  external_thread_id text not null,
  status             text not null default 'open' check (status in ('open','pending','resolved')),
  assignee_id        uuid references auth.users(id) on delete set null,
  handled_by         text check (handled_by in ('bot','human')),
  last_message_at    timestamptz,
  last_inbound_at    timestamptz,
  unread_count       int not null default 0 check (unread_count >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (channel_id, external_thread_id)
);

create index conversations_org_status_lastmsg_idx
  on public.conversations(organization_id, status, last_message_at desc);

create index conversations_contact_idx
  on public.conversations(contact_id) where contact_id is not null;

create index conversations_assignee_idx
  on public.conversations(assignee_id) where assignee_id is not null;

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger conversations_freeze_org
  before update on public.conversations
  for each row execute function public.freeze_messaging_org();

alter table public.conversations enable row level security;

create policy "conversations: members read" on public.conversations
  for select using (public.is_org_member(organization_id));

create policy "conversations: members insert" on public.conversations
  for insert with check (public.is_org_member(organization_id));

create policy "conversations: members update" on public.conversations
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "conversations: members delete" on public.conversations
  for delete using (public.is_org_member(organization_id));

comment on table public.conversations is 'Conversa 1:1 entre o canal da org e um contato externo (Sub-projeto A).';
comment on column public.conversations.handled_by is 'Quem responde agora: bot ou human. Diferente de assignee_id (responsável organizacional).';
