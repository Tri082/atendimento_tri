-- Sub-projeto C: tags pra conversas (catálogo + junction).

create table public.conversation_tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(name) between 1 and 40),
  color           text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);
create index conversation_tags_org_idx on public.conversation_tags(organization_id);

create table public.conversation_tag_links (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tag_id          uuid not null references public.conversation_tags(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);
create index conversation_tag_links_tag_idx on public.conversation_tag_links(tag_id);

alter table public.conversation_tags enable row level security;
create policy "tags: members read" on public.conversation_tags
  for select using (public.is_org_member(organization_id));
create policy "tags: members write" on public.conversation_tags
  for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.conversation_tag_links enable row level security;
create policy "tag links: members rw" on public.conversation_tag_links
  for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter publication supabase_realtime add table public.conversation_tag_links;

comment on table public.conversation_tags is 'Catálogo de tags por organização (Sub-projeto C).';
comment on table public.conversation_tag_links is 'Junction conversation × tag (Sub-projeto C).';
