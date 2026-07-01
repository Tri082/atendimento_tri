-- supabase/migrations/20260604043000_inbox_realtime_broadcast_refactor.sql
--
-- Refactor: inbox sai de `postgres_changes` (walrus + apply_rls) pra
-- broadcast triggered (realtime.send em trigger + channel privado).
--
-- Por quê: o caminho postgres_changes depende de grant em
-- `is_org_member` pra `supabase_realtime_admin`, e o broker do Realtime
-- (driver Postgrex) cacheia o resultado do permission check no
-- prepared statement `walrus_rls_stmt`. Quando o grant chega depois do
-- primeiro subscribe, o broker continua respondendo `permission
-- denied` até restart do projeto — armadilha pra todo aluno novo.
--
-- O broadcast triggered ignora apply_rls completamente. A trigger
-- function `messaging_broadcast` chama `realtime.send` direto, e a
-- autorização do subscriber é via policy normal em `realtime.messages`
-- (Postgrest request, sem cache long-lived).

--------------------------------------------------------------------
-- Parte A: limpa o setup antigo de postgres_changes
--------------------------------------------------------------------

-- Tira as 3 tabelas da publication `supabase_realtime`. Sem isso
-- continuariam gerando eventos pro broker (mesmo que ignorados pelo
-- cliente) — desperdício de WAL.
alter publication supabase_realtime drop table public.conversations;
alter publication supabase_realtime drop table public.messages;
alter publication supabase_realtime drop table public.conversation_tag_links;

-- Reverte replica identity. `full` só era necessário pra postgres_changes
-- carregar a coluna `organization_id` no payload UPDATE. Trigger não
-- precisa, e `default` reduz peso do WAL em UPDATE.
alter table public.conversations replica identity default;
alter table public.messages replica identity default;
alter table public.conversation_tag_links replica identity default;

-- Revoga grant que só servia pro apply_rls do postgres_changes.
revoke execute on function public.is_org_member(uuid) from supabase_realtime_admin;
revoke execute on function public.has_org_role(uuid, public.org_role[]) from supabase_realtime_admin;

--------------------------------------------------------------------
-- Parte B: trigger function + triggers
--------------------------------------------------------------------

-- Trigger function que envia broadcast pra cada mutação. Roda como
-- SECURITY DEFINER pra ter direito de chamar `realtime.send` mesmo
-- quando o INSERT/UPDATE vem do service client.
create or replace function public.messaging_broadcast() returns trigger
  language plpgsql
  security definer
  set search_path = public, realtime
as $$
declare
  v_org_id uuid;
  v_topic  text;
  v_payload jsonb;
begin
  -- Pega org_id de NEW (INSERT/UPDATE) ou OLD (DELETE).
  v_org_id := coalesce(
    (case when tg_op <> 'DELETE' then new.organization_id end),
    (case when tg_op <> 'INSERT' then old.organization_id end)
  );

  if v_org_id is null then
    return null;
  end if;

  v_topic := 'inbox:' || v_org_id::text;

  -- Monta payload compacto: o cliente só precisa saber QUE algo mudou
  -- pra disparar router.refresh(). row inteira é redundante porque a
  -- página re-fetcha. Inclui `op` + `table` pra debugging e pra abrir
  -- otimizações futuras sem migration.
  v_payload := jsonb_build_object(
    'table', tg_table_name,
    'op',    tg_op,
    'id',    case
               when tg_op = 'DELETE' then old.id::text
               else new.id::text
             end
  );

  perform realtime.send(v_payload, 'change', v_topic, true);
  return null;
end;
$$;

comment on function public.messaging_broadcast() is
  'Trigger que envia broadcast no channel `inbox:{org_id}` pra cada mutação em conversations/messages/conversation_tag_links. Substitui o postgres_changes original (que dependia de grants frágeis no apply_rls).';

-- Triggers AFTER (pra rodar depois do commit lógico — INSERT já visível
-- na próxima query). `FOR EACH ROW` porque queremos um broadcast por
-- evento, não por statement.
create trigger messaging_broadcast_trg
  after insert or update or delete on public.conversations
  for each row execute function public.messaging_broadcast();

create trigger messaging_broadcast_trg
  after insert or update or delete on public.messages
  for each row execute function public.messaging_broadcast();

create trigger messaging_broadcast_trg
  after insert or update or delete on public.conversation_tag_links
  for each row execute function public.messaging_broadcast();

--------------------------------------------------------------------
-- Parte C: autorização do subscriber em channel privado
--------------------------------------------------------------------

-- Pra channels privados o Realtime consulta policies em `realtime.messages`
-- pra decidir se o user pode subscribar. Essa avaliação é Postgrest
-- request normal (não usa o prepared statement do broker), então é
-- imune ao bug que motivou este refactor.
--
-- Inline subquery em `public.memberships` em vez de chamar
-- `is_org_member`: explicita o critério na policy e evita acoplar à
-- definição do helper (que muda menos que esta policy).
create policy "realtime: org members subscribe inbox topic"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() like 'inbox:%'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and 'inbox:' || m.organization_id::text = realtime.topic()
    )
  );

comment on policy "realtime: org members subscribe inbox topic" on realtime.messages is
  'Autoriza membros da org a subscribar o channel privado `inbox:{org_id}` (broadcast triggered pelos triggers messaging_broadcast).';
