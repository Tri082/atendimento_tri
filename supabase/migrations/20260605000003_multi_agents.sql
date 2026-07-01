-- Sub-projeto E: Multi-agentes por organização.
-- Spec: docs/superpowers/specs/2026-06-02-multi-agentes-por-org-design.md
-- Atomic transaction: tudo dentro de begin/commit (Supabase aplica migration assim por padrão)

-- ============================================================================
-- 1) Nova tabela agents
-- ============================================================================
create table public.agents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(name) between 1 and 80),
  company_name     text,
  persona          text,
  goal             text,
  tone             text not null default 'casual' check (tone in ('formal','casual','amigavel')),
  never_do         text,
  daily_token_cap  integer not null default 200000 check (daily_token_cap > 0),
  llm_provider     text not null default 'anthropic' check (llm_provider in ('anthropic','openai')),
  llm_model        text not null default 'claude-haiku-4-5-20251001',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);
create index agents_org_idx on public.agents(organization_id);
alter table public.agents enable row level security;
create policy "agents: admin rw" on public.agents
  for all using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "agents: member read" on public.agents
  for select using (public.is_org_member(organization_id));
comment on table public.agents is 'Agentes IA por organização (Sub-projeto E, substituiu agent_settings).';

-- ============================================================================
-- 2) Backfill: cria "Agente Principal" por org existente
-- ============================================================================
-- 2a) Orgs com agent_settings preexistente herdam todos os campos
insert into public.agents (
  organization_id, name, company_name, persona, goal, tone,
  never_do, daily_token_cap, llm_provider, llm_model, is_active
)
select s.organization_id, 'Agente Principal',
       s.company_name, s.persona, s.goal, s.tone, s.never_do,
       s.daily_token_cap, s.llm_provider, s.llm_model, true
  from public.agent_settings s;

-- 2b) Orgs sem agent_settings (nunca configuraram agente) ganham defaults
insert into public.agents (organization_id, name, is_active)
select o.id, 'Agente Principal', true
  from public.organizations o
 where not exists (select 1 from public.agents a where a.organization_id = o.id);

-- ============================================================================
-- 3) Adiciona agent_id (nullable) em tabelas dependentes
-- ============================================================================
alter table public.agent_faq_items
  add column agent_id uuid references public.agents(id) on delete cascade;
alter table public.agent_documents
  add column agent_id uuid references public.agents(id) on delete cascade;
alter table public.agent_document_chunks
  add column agent_id uuid references public.agents(id) on delete cascade;
alter table public.agent_runs
  add column agent_id uuid references public.agents(id) on delete cascade;
alter table public.channels
  add column agent_id uuid references public.agents(id) on delete set null;

-- ============================================================================
-- 4) Backfill: amarra dados existentes no "Agente Principal" da respectiva org
-- ============================================================================
update public.agent_faq_items f
   set agent_id = (
     select id from public.agents
      where organization_id = f.organization_id and name = 'Agente Principal'
   );
update public.agent_documents d
   set agent_id = (
     select id from public.agents
      where organization_id = d.organization_id and name = 'Agente Principal'
   );
update public.agent_document_chunks c
   set agent_id = (
     select id from public.agents
      where organization_id = c.organization_id and name = 'Agente Principal'
   );
update public.agent_runs r
   set agent_id = (
     select id from public.agents
      where organization_id = r.organization_id and name = 'Agente Principal'
   );
-- channels: SÓ os que estavam ativos recebem agent_id; resto fica NULL
update public.channels ch
   set agent_id = (
     select id from public.agents
      where organization_id = ch.organization_id and name = 'Agente Principal'
   )
 where ch.agent_enabled = true;

-- ============================================================================
-- 5) Promove agent_id pra NOT NULL onde aplicável
-- ============================================================================
alter table public.agent_faq_items       alter column agent_id set not null;
alter table public.agent_documents       alter column agent_id set not null;
alter table public.agent_document_chunks alter column agent_id set not null;
alter table public.agent_runs            alter column agent_id set not null;
create index agent_faq_agent_idx        on public.agent_faq_items(agent_id);
create index agent_docs_agent_idx       on public.agent_documents(agent_id);
create index agent_chunks_agent_idx     on public.agent_document_chunks(agent_id);
create index agent_runs_agent_idx       on public.agent_runs(agent_id, started_at desc);
create index channels_agent_idx         on public.channels(agent_id) where agent_id is not null;

-- ============================================================================
-- 6) agent_org_usage → agent_usage_daily (PK vira (agent_id, day))
-- ============================================================================
create table public.agent_usage_daily (
  agent_id        uuid not null references public.agents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  day             date not null default current_date,
  tokens_used     integer not null default 0,
  responses       integer not null default 0,
  primary key (agent_id, day)
);
create index agent_usage_daily_org_idx on public.agent_usage_daily(organization_id, day);
alter table public.agent_usage_daily enable row level security;
-- Sem policy: só RPC SECURITY DEFINER lê/escreve

insert into public.agent_usage_daily (agent_id, organization_id, day, tokens_used, responses)
select (
         select id from public.agents
          where organization_id = u.organization_id and name = 'Agente Principal'
       ),
       u.organization_id, u.day, u.tokens_used, u.responses
  from public.agent_org_usage u;

drop table public.agent_org_usage;
comment on table public.agent_usage_daily is 'Uso diário de tokens por agente (Sub-projeto E).';

-- ============================================================================
-- 7) Reescreve RPCs com _agent_id
-- ============================================================================
drop function if exists public.agent_search_kb(uuid, vector, int, float);
create or replace function public.agent_search_kb(
  _agent_id uuid,
  _query_embedding vector(1536),
  _limit int default 5,
  _min_similarity float default 0.5
)
returns table (kind text, source_id uuid, title text, content text, similarity float)
language sql security definer set search_path = public, extensions, pg_temp as $$
  with faq as (
    select 'faq'::text as kind,
           id as source_id,
           question as title,
           question || E'\n\n' || answer as content,
           1 - (embedding <=> _query_embedding) as similarity
      from public.agent_faq_items
     where agent_id = _agent_id and embedding is not null
  ),
  chunks as (
    select 'doc'::text as kind,
           c.id as source_id,
           d.filename as title,
           c.content,
           1 - (c.embedding <=> _query_embedding) as similarity
      from public.agent_document_chunks c
      join public.agent_documents d on d.id = c.document_id
     where c.agent_id = _agent_id
       and c.embedding is not null
       and d.status = 'ready'
  )
  select * from (select * from faq union all select * from chunks) hits
  where similarity >= _min_similarity
  order by similarity desc
  limit _limit;
$$;
revoke execute on function public.agent_search_kb(uuid, vector, int, float) from anon;

drop function if exists public.consume_agent_tokens(uuid, int);
create or replace function public.consume_agent_tokens(_agent_id uuid, _tokens int)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cap      int;
  org_id   uuid;
  current_used int;
begin
  select daily_token_cap, organization_id
    into cap, org_id
    from public.agents
   where id = _agent_id;
  if cap is null then return false; end if;

  insert into public.agent_usage_daily (agent_id, organization_id, tokens_used, responses)
    values (_agent_id, org_id, _tokens, 1)
    on conflict (agent_id, day) do update
      set tokens_used = public.agent_usage_daily.tokens_used + _tokens,
          responses   = public.agent_usage_daily.responses + 1
    returning tokens_used into current_used;

  return current_used <= cap;
end $$;
revoke execute on function public.consume_agent_tokens(uuid, int) from anon;

drop function if exists public.adjust_agent_tokens(uuid, int);
create or replace function public.adjust_agent_tokens(_agent_id uuid, _delta int)
returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.agent_usage_daily
     set tokens_used = greatest(0, tokens_used + _delta)
   where agent_id = _agent_id
     and day = current_date;
$$;
revoke execute on function public.adjust_agent_tokens(uuid, int) from anon;

-- ============================================================================
-- 8) Atualiza storage_path em agent_documents pra incluir agent_id
-- ============================================================================
update public.agent_documents
   set storage_path = organization_id::text || '/' || agent_id::text
                      || substring(storage_path from length(organization_id::text) + 1)
 where storage_path not like '%/' || agent_id::text || '/%';

-- ============================================================================
-- 9) Storage policies pro bucket agent-kb (novo prefixo {org}/{agent}/...)
-- ============================================================================
drop policy if exists "agent-kb: admin read"   on storage.objects;
drop policy if exists "agent-kb: admin write"  on storage.objects;
drop policy if exists "agent-kb: admin delete" on storage.objects;

create policy "agent-kb: admin read"
  on storage.objects for select
  using (
    bucket_id = 'agent-kb'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.org_role[]
    )
    and exists (
      select 1 from public.agents a
      where a.id = ((storage.foldername(name))[2])::uuid
        and a.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

create policy "agent-kb: admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'agent-kb'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.org_role[]
    )
    and exists (
      select 1 from public.agents a
      where a.id = ((storage.foldername(name))[2])::uuid
        and a.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

create policy "agent-kb: admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'agent-kb'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.org_role[]
    )
  );

-- ============================================================================
-- 10) Trigger: cria "Agente Principal" automaticamente em orgs novas
-- ============================================================================
create or replace function public.create_default_agent_for_org()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.agents (organization_id, name, is_active)
  values (new.id, 'Agente Principal', true);
  return new;
end $$;

create trigger orgs_create_default_agent
  after insert on public.organizations
  for each row execute function public.create_default_agent_for_org();

-- ============================================================================
-- 11) Realtime
-- ============================================================================
alter publication supabase_realtime add table public.agents;

-- ============================================================================
-- 12) Cleanup (último — drop só depois de garantir que backfill rodou)
-- ============================================================================
alter table public.channels drop column agent_enabled;
drop table public.agent_settings;
