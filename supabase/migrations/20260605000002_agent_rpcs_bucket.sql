-- Sub-projeto D: RPCs do agente + bucket Storage.

-- ============================================================================
-- RPC: agent_search_kb — busca top-K em FAQ + chunks
-- ============================================================================
create or replace function public.agent_search_kb(
  _org_id uuid,
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
     where organization_id = _org_id and embedding is not null
  ),
  chunks as (
    select 'doc'::text as kind,
           c.id as source_id,
           d.filename as title,
           c.content,
           1 - (c.embedding <=> _query_embedding) as similarity
      from public.agent_document_chunks c
      join public.agent_documents d on d.id = c.document_id
     where c.organization_id = _org_id
       and c.embedding is not null
       and d.status = 'ready'
  )
  select * from (select * from faq union all select * from chunks) hits
  where similarity >= _min_similarity
  order by similarity desc
  limit _limit;
$$;

revoke execute on function public.agent_search_kb(uuid, vector, int, float) from anon;

-- ============================================================================
-- RPC: consume_agent_tokens — consome cota diária da org
-- ============================================================================
create or replace function public.consume_agent_tokens(_org_id uuid, _tokens int)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cap int;
  current_used int;
begin
  select daily_token_cap into cap from public.agent_settings where organization_id = _org_id;
  cap := coalesce(cap, 200000);

  insert into public.agent_org_usage (organization_id, tokens_used, responses)
    values (_org_id, _tokens, 1)
    on conflict (organization_id, day) do update
      set tokens_used = public.agent_org_usage.tokens_used + _tokens,
          responses = public.agent_org_usage.responses + 1
    returning tokens_used into current_used;

  return current_used <= cap;
end $$;

revoke execute on function public.consume_agent_tokens(uuid, int) from anon;

-- ============================================================================
-- RPC: adjust_agent_tokens — ajusta usage retroativamente
-- ============================================================================
create or replace function public.adjust_agent_tokens(_org_id uuid, _delta int)
returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.agent_org_usage
     set tokens_used = greatest(0, tokens_used + _delta)
   where organization_id = _org_id
     and day = current_date;
$$;

revoke execute on function public.adjust_agent_tokens(uuid, int) from anon;

-- ============================================================================
-- Bucket Storage 'agent-kb' (privado)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'agent-kb',
    'agent-kb',
    false,
    20971520,  -- 20 MB
    array['application/pdf']
  )
  on conflict (id) do nothing;

-- Policies: admin/owner da org lê+escreve em seu próprio prefixo {org_id}/...
create policy "agent-kb: admin read"
  on storage.objects for select
  using (
    bucket_id = 'agent-kb'
    and public.has_org_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.org_role[]
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
-- Realtime: agent_documents (pra status reativo na UI)
-- ============================================================================
alter publication supabase_realtime add table public.agent_documents;
