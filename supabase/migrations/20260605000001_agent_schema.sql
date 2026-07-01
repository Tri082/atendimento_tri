-- Sub-projeto D: schema base do agente IA.

create extension if not exists vector;

-- Colunas novas em tabelas existentes
alter table public.channels
  add column if not exists agent_enabled boolean not null default false;

alter table public.conversations
  add column if not exists agent_status text not null default 'idle'
    check (agent_status in ('idle', 'thinking', 'paused_handoff')),
  add column if not exists agent_thinking_started_at timestamptz;

-- ============================================================================
-- 1) Config do agente por org
-- ============================================================================
create table public.agent_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  agent_name       text not null default 'Atendente',
  company_name     text,
  persona          text,
  goal             text,
  tone             text not null default 'casual' check (tone in ('formal','casual','amigavel')),
  never_do         text,
  daily_token_cap  integer not null default 200000 check (daily_token_cap > 0),
  llm_provider     text not null default 'anthropic' check (llm_provider in ('anthropic','openai')),
  llm_model        text not null default 'claude-haiku-4-5-20251001',
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null
);
alter table public.agent_settings enable row level security;
create policy "agent_settings: admin rw" on public.agent_settings
  for all using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

-- ============================================================================
-- 2) FAQ items
-- ============================================================================
create table public.agent_faq_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question        text not null check (length(question) between 1 and 500),
  answer          text not null check (length(answer) between 1 and 5000),
  embedding       vector(1536),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index agent_faq_org_idx on public.agent_faq_items(organization_id);
create index agent_faq_embed_idx on public.agent_faq_items
  using hnsw (embedding vector_cosine_ops);
alter table public.agent_faq_items enable row level security;
create policy "faq: admin rw" on public.agent_faq_items
  for all using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

-- ============================================================================
-- 3) Documentos uploadados (PDFs)
-- ============================================================================
create table public.agent_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  filename        text not null,
  storage_path    text not null,
  mime_type       text not null,
  size_bytes      integer not null check (size_bytes > 0),
  status          text not null default 'pending'
    check (status in ('pending','processing','ready','failed')),
  chunk_count     integer not null default 0,
  error_message   text,
  created_at      timestamptz not null default now(),
  ready_at        timestamptz
);
create index agent_docs_org_idx on public.agent_documents(organization_id);
create index agent_docs_status_idx on public.agent_documents(status);
alter table public.agent_documents enable row level security;
create policy "docs: admin rw" on public.agent_documents
  for all using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

-- ============================================================================
-- 4) Chunks de documentos com embedding
-- ============================================================================
create table public.agent_document_chunks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id     uuid not null references public.agent_documents(id) on delete cascade,
  chunk_index     integer not null,
  content         text not null,
  embedding       vector(1536),
  unique (document_id, chunk_index)
);
create index agent_chunks_embed_idx on public.agent_document_chunks
  using hnsw (embedding vector_cosine_ops);
create index agent_chunks_org_idx on public.agent_document_chunks(organization_id);
alter table public.agent_document_chunks enable row level security;
create policy "chunks: member read" on public.agent_document_chunks
  for select using (public.is_org_member(organization_id));

-- ============================================================================
-- 5) Runs do agente (observabilidade)
-- ============================================================================
create table public.agent_runs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  status            text not null check (status in ('running','succeeded','failed','timed_out')),
  prompt_tokens     integer,
  completion_tokens integer,
  tools_called      jsonb not null default '[]'::jsonb,
  error_message     text,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);
create index agent_runs_conv_idx on public.agent_runs(conversation_id, started_at desc);
create index agent_runs_org_idx on public.agent_runs(organization_id, started_at desc);
alter table public.agent_runs enable row level security;
create policy "runs: member read" on public.agent_runs
  for select using (public.is_org_member(organization_id));

-- ============================================================================
-- 6) Uso diário por org (cost cap)
-- ============================================================================
create table public.agent_org_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  day             date not null default current_date,
  tokens_used     integer not null default 0,
  responses       integer not null default 0,
  primary key (organization_id, day)
);
create index agent_org_usage_day_idx on public.agent_org_usage(day);
alter table public.agent_org_usage enable row level security;
-- Sem policy: só RPC SECURITY DEFINER lê/escreve

-- ============================================================================
-- Comentários
-- ============================================================================
comment on table public.agent_settings is 'Configuração do agente IA por organização (Sub-projeto D).';
comment on table public.agent_faq_items is 'FAQ items (texto curto) com embedding pra RAG (Sub-projeto D).';
comment on table public.agent_documents is 'Documentos (PDFs) uploadados pra base de conhecimento (Sub-projeto D).';
comment on table public.agent_document_chunks is 'Chunks de documentos com embedding (Sub-projeto D).';
comment on table public.agent_runs is 'Log de execuções do agente (Sub-projeto D).';
comment on table public.agent_org_usage is 'Uso diário de tokens por org pra cost cap (Sub-projeto D).';
