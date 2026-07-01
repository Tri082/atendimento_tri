-- Sub-projeto Tags: expansão do `conversation_tags` em catálogo universal
-- com escopo por entidade. Reaproveita estrutura existente do Sub-C.

-- =========================================================
-- 1) Renomeia conversation_tags → tags e adiciona applies_to
-- =========================================================
alter table public.conversation_tags rename to tags;

alter table public.tags
  add column applies_to text[] not null
    default array['conversation','contact','company','deal']::text[];

-- Constraint: applies_to só aceita os 4 valores válidos + tem que ter pelo menos 1
alter table public.tags
  add constraint tags_applies_to_valid_values
    check (applies_to <@ array['conversation','contact','company','deal']::text[]);

alter table public.tags
  add constraint tags_applies_to_not_empty
    check (array_length(applies_to, 1) >= 1);

-- Tags pré-existentes do Sub-C ficam com escopo só-conversa (preserva comportamento atual)
update public.tags set applies_to = array['conversation']::text[];

comment on table public.tags is 'Catálogo de tags universais por organização (Tags CRM).';
comment on column public.tags.applies_to is 'Em quais entidades essa tag pode ser aplicada. Validado em trigger BEFORE INSERT em cada junção.';

-- =========================================================
-- 2) Expande conversation_tag_links com colunas de origem
-- =========================================================
alter table public.conversation_tag_links
  add column applied_by_kind text not null default 'human'
    check (applied_by_kind in ('human','bot','automation')),
  add column applied_by uuid references auth.users(id) on delete set null,
  add column applied_at timestamptz not null default now();

-- =========================================================
-- 3) Cria contact_tag_links
-- =========================================================
create table public.contact_tag_links (
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  tag_id           uuid not null references public.tags(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  applied_by_kind  text not null default 'human'
                   check (applied_by_kind in ('human','bot','automation')),
  applied_by       uuid references auth.users(id) on delete set null,
  applied_at       timestamptz not null default now(),
  primary key (contact_id, tag_id)
);
create index contact_tag_links_tag_idx on public.contact_tag_links(tag_id);
create index contact_tag_links_org_idx on public.contact_tag_links(organization_id);

alter table public.contact_tag_links enable row level security;

create policy "contact_tag_links: members read" on public.contact_tag_links
  for select using (public.is_org_member(organization_id));
create policy "contact_tag_links: members insert" on public.contact_tag_links
  for insert with check (public.is_org_member(organization_id));
create policy "contact_tag_links: members delete" on public.contact_tag_links
  for delete using (public.is_org_member(organization_id));

-- =========================================================
-- 4) Cria company_tag_links
-- =========================================================
create table public.company_tag_links (
  company_id       uuid not null references public.companies(id) on delete cascade,
  tag_id           uuid not null references public.tags(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  applied_by_kind  text not null default 'human'
                   check (applied_by_kind in ('human','bot','automation')),
  applied_by       uuid references auth.users(id) on delete set null,
  applied_at       timestamptz not null default now(),
  primary key (company_id, tag_id)
);
create index company_tag_links_tag_idx on public.company_tag_links(tag_id);
create index company_tag_links_org_idx on public.company_tag_links(organization_id);

alter table public.company_tag_links enable row level security;

create policy "company_tag_links: members read" on public.company_tag_links
  for select using (public.is_org_member(organization_id));
create policy "company_tag_links: members insert" on public.company_tag_links
  for insert with check (public.is_org_member(organization_id));
create policy "company_tag_links: members delete" on public.company_tag_links
  for delete using (public.is_org_member(organization_id));

-- =========================================================
-- 5) Cria deal_tag_links
-- =========================================================
create table public.deal_tag_links (
  deal_id          uuid not null references public.deals(id) on delete cascade,
  tag_id           uuid not null references public.tags(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  applied_by_kind  text not null default 'human'
                   check (applied_by_kind in ('human','bot','automation')),
  applied_by       uuid references auth.users(id) on delete set null,
  applied_at       timestamptz not null default now(),
  primary key (deal_id, tag_id)
);
create index deal_tag_links_tag_idx on public.deal_tag_links(tag_id);
create index deal_tag_links_org_idx on public.deal_tag_links(organization_id);

alter table public.deal_tag_links enable row level security;

create policy "deal_tag_links: members read" on public.deal_tag_links
  for select using (public.is_org_member(organization_id));
create policy "deal_tag_links: members insert" on public.deal_tag_links
  for insert with check (public.is_org_member(organization_id));
create policy "deal_tag_links: members delete" on public.deal_tag_links
  for delete using (public.is_org_member(organization_id));

-- =========================================================
-- 6) Cria tag_suggestions
-- =========================================================
create table public.tag_suggestions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(name) between 1 and 40),
  suggested_by    text not null check (suggested_by in ('agent','automation')),
  source_entity   text not null check (source_entity in ('conversation','contact','deal')),
  source_id       uuid not null,
  occurrences     int not null default 1,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  resolved_status text check (resolved_status in ('promoted','ignored')),
  resolved_at     timestamptz,
  resolved_by     uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);
create index tag_suggestions_org_pending_idx on public.tag_suggestions(organization_id) where resolved_status is null;

alter table public.tag_suggestions enable row level security;

create policy "tag_suggestions: admins read" on public.tag_suggestions
  for select using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "tag_suggestions: members insert" on public.tag_suggestions
  for insert with check (public.is_org_member(organization_id));
create policy "tag_suggestions: admins update" on public.tag_suggestions
  for update using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "tag_suggestions: admins delete" on public.tag_suggestions
  for delete using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

comment on table public.tag_suggestions is 'Tags propostas por agente IA/automação que admin pode promover ou ignorar.';

-- =========================================================
-- 7) Endurece RLS em `tags`: SELECT pra todos, mutations só admin
-- =========================================================
drop policy if exists "tags: members read" on public.tags;
drop policy if exists "tags: members write" on public.tags;

create policy "tags: members read" on public.tags
  for select using (public.is_org_member(organization_id));
create policy "tags: admins insert" on public.tags
  for insert with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "tags: admins update" on public.tags
  for update using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
            with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "tags: admins delete" on public.tags
  for delete using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

-- =========================================================
-- 8) Função de validação de escopo
-- =========================================================
create or replace function public.assert_tag_scope(p_tag_id uuid, p_scope text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_applies_to text[];
begin
  select applies_to into v_applies_to from public.tags where id = p_tag_id;
  if v_applies_to is null then
    raise exception 'Tag % não existe', p_tag_id using errcode = 'foreign_key_violation';
  end if;
  if not (p_scope = any(v_applies_to)) then
    raise exception 'Tag % não pode ser aplicada em %', p_tag_id, p_scope
      using errcode = 'check_violation';
  end if;
end $$;

revoke all on function public.assert_tag_scope(uuid, text) from public, anon, authenticated;

-- =========================================================
-- 9) Triggers BEFORE INSERT validam escopo em cada junção
-- =========================================================
create or replace function public.conversation_tag_links_check_scope()
returns trigger language plpgsql as $$
begin perform public.assert_tag_scope(new.tag_id, 'conversation'); return new; end $$;

create or replace function public.contact_tag_links_check_scope()
returns trigger language plpgsql as $$
begin perform public.assert_tag_scope(new.tag_id, 'contact'); return new; end $$;

create or replace function public.company_tag_links_check_scope()
returns trigger language plpgsql as $$
begin perform public.assert_tag_scope(new.tag_id, 'company'); return new; end $$;

create or replace function public.deal_tag_links_check_scope()
returns trigger language plpgsql as $$
begin perform public.assert_tag_scope(new.tag_id, 'deal'); return new; end $$;

create trigger conversation_tag_links_assert_scope
  before insert on public.conversation_tag_links
  for each row execute function public.conversation_tag_links_check_scope();

create trigger contact_tag_links_assert_scope
  before insert on public.contact_tag_links
  for each row execute function public.contact_tag_links_check_scope();

create trigger company_tag_links_assert_scope
  before insert on public.company_tag_links
  for each row execute function public.company_tag_links_check_scope();

create trigger deal_tag_links_assert_scope
  before insert on public.deal_tag_links
  for each row execute function public.deal_tag_links_check_scope();

-- =========================================================
-- 10) Trigger freeze_org_and_creator nas 3 junções novas
-- =========================================================
create trigger contact_tag_links_freeze
  before update on public.contact_tag_links
  for each row execute function public.freeze_org_and_creator();
create trigger company_tag_links_freeze
  before update on public.company_tag_links
  for each row execute function public.freeze_org_and_creator();
create trigger deal_tag_links_freeze
  before update on public.deal_tag_links
  for each row execute function public.freeze_org_and_creator();

-- =========================================================
-- 11) Realtime publication pras 3 junções novas
-- =========================================================
alter publication supabase_realtime add table public.contact_tag_links;
alter publication supabase_realtime add table public.company_tag_links;
alter publication supabase_realtime add table public.deal_tag_links;

-- =========================================================
-- 12) RPC pra upsert de tag_suggestions com increment atômico
-- =========================================================
create or replace function public.tag_suggestion_upsert(
  p_org uuid, p_name text, p_suggested_by text,
  p_source_entity text, p_source_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.tag_suggestions (organization_id, name, suggested_by, source_entity, source_id)
  values (p_org, p_name, p_suggested_by, p_source_entity, p_source_id)
  on conflict (organization_id, name)
  do update set
    occurrences = tag_suggestions.occurrences + 1,
    last_seen_at = now()
  where tag_suggestions.resolved_status is null;
end $$;

revoke all on function public.tag_suggestion_upsert(uuid, text, text, text, uuid) from public, anon;
grant execute on function public.tag_suggestion_upsert(uuid, text, text, text, uuid) to authenticated, service_role;
