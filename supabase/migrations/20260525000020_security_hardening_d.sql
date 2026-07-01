-- ============================================================================
-- brechas de UPDATE em invitations/memberships, adiciona defesa em
-- profundidade contra XSS no avatar_url, serializa demoções concorrentes
-- de owners, e endurece pg_temp em todas SECURITY DEFINER.
--
-- Triggers BEFORE UPDATE em public.memberships disparam em ordem alfabética:
--   1) memberships_assert_owner   -> só valida (não muta NEW)
--   2) memberships_freeze_keys    -> só valida (não muta NEW)
-- Se adicionar trigger novo que MUTE NEW, revise a ordem (use `00_` ou
-- `zz_` como prefixo pra controlar precedência).
--
-- Pré-requisito de deploy: as funções com SECURITY DEFINER usadas aqui
-- precisam ter sido criadas por um role com SELECT em auth.users (postgres
-- no SQL Editor padrão do Supabase). Deploy custom via role limitado pode
-- falhar no runtime das funções com "permission denied for table users".
-- ============================================================================
-- ----------------------------------------------------------------------------
-- B1. freeze_org_creator: permitir SOMENTE cascade legítimo de auth.users
-- ----------------------------------------------------------------------------
-- Só aceita created_by → NULL quando o auth.users referenciado já não existe
-- (i.e., realmente foi um cascade do on-delete-set-null). Admin malicioso
-- tentando anonimizar manualmente o criador é bloqueado.
-- SECURITY DEFINER porque authenticated não tem SELECT em auth.users.
-- pg_temp por último previne search_path hijack (CVE-2018-1058 hardening).
create or replace function public.freeze_org_creator()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    if new.created_by is null
       and old.created_by is not null
       and not exists (select 1 from auth.users where id = old.created_by) then
      return new;  -- cascade legítimo: usuário foi deletado
    end if;
    raise exception 'organizations.created_by is immutable';
  end if;
  return new;
end;
$$;
revoke execute on function public.freeze_org_creator() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- B2. freeze_org_and_creator (tasks): mesmo padrão de B1.
-- ----------------------------------------------------------------------------
-- Risco extra em tasks: a policy "members update tasks" permite QUALQUER
-- member editar QUALQUER task da org (não só dono). Sem essa proteção, um
-- estagiário podia anonimizar autoria de tasks alheias em massa.
create or replace function public.freeze_org_and_creator()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable (security)';
  end if;
  if new.created_by is distinct from old.created_by then
    if new.created_by is null
       and old.created_by is not null
       and not exists (select 1 from auth.users where id = old.created_by) then
      return new;  -- cascade legítimo
    end if;
    raise exception 'created_by is immutable (security)';
  end if;
  return new;
end;
$$;
revoke execute on function public.freeze_org_and_creator() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- B3. freeze_invitation_fields: SÓ accepted_at é mutável (e só null→ts).
-- ----------------------------------------------------------------------------
-- Defesa contra privilege escalation: destinatário podia trocar role/org/
-- token via UPDATE direto (policy filtrava só por email, sem WITH CHECK por
-- coluna). Lista explícita de colunas (em vez de jsonb diff) pra evitar
-- breakage silencioso se alguém adicionar coluna de tipo exótico
-- (bytea/tsvector/geometry) que não round-trip por to_jsonb.
-- Adicionar coluna nova? Adicione aqui também (explícito > mágico p/ leigo).
create or replace function public.freeze_invitation_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.token is distinct from old.token
     or new.invited_by is distinct from old.invited_by
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'only accepted_at can be modified on invitations';
  end if;
  if old.accepted_at is not null and new.accepted_at is null then
    raise exception 'accepted_at cannot be unset';
  end if;
  return new;
end;
$$;
revoke execute on function public.freeze_invitation_fields() from public, anon, authenticated;

drop trigger if exists invitations_freeze_fields on public.invitations;
create trigger invitations_freeze_fields
  before update on public.invitations
  for each row execute function public.freeze_invitation_fields();

-- ----------------------------------------------------------------------------
-- B4. freeze_membership_keys: SÓ role é mutável.
-- ----------------------------------------------------------------------------
-- Bloqueia transferência de membership entre orgs/users e anti-datação de
-- created_at. Lista explícita (igual B3).
create or replace function public.freeze_membership_keys()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'only role can be modified on memberships';
  end if;
  return new;
end;
$$;
revoke execute on function public.freeze_membership_keys() from public, anon, authenticated;

drop trigger if exists memberships_freeze_keys on public.memberships;
create trigger memberships_freeze_keys
  before update on public.memberships
  for each row execute function public.freeze_membership_keys();

-- ----------------------------------------------------------------------------
-- B5. handle_new_user: defensivo contra race no signup.
-- ----------------------------------------------------------------------------
-- on conflict (id) do nothing evita que race ou replay quebre o INSERT em
-- auth.users. Não emite warning: o conflict path dispara em todo replay
-- legítimo das migrations (não é "integrity issue") e logar new.id seria
-- mini-leak de PII pros logs do Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text;
  v_avatar_url text;
begin
  v_full_name := substr(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      '[[:cntrl:]]', '', 'g'
    ),
    1, 100
  );

  v_avatar_url := new.raw_user_meta_data ->> 'avatar_url';
  if v_avatar_url is not null and v_avatar_url !~* '^https://' then
    v_avatar_url := null;
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, v_full_name, v_avatar_url)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Re-bind do trigger pra apontar pra esta versão de handle_new_user.
-- Idempotente; protege contra ordem de execução partida das migrations.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- B6. CHECK constraint profiles.avatar_url: força https:// + endurece.
-- ----------------------------------------------------------------------------
-- Defense XSS: rejeita javascript:, data:, vbscript:, file:, //protocol-
-- relative — qualquer URL que o browser pudesse interpretar como código em
-- <img src> ou render direto. Adicional:
--   - length <= 2048 (URL spec prático; previne DoS por payload gigante)
--   - sem control chars (browsers normalizam de formas inconsistentes)
--   - case-insensitive (~*) bate com handle_new_user que aceita HTTPS://
-- NOT VALID: aplica a writes futuros sem scan de existentes (idempotente em
-- DB com dados legados). Saneia antes pro caso de re-aplicar sem dúvidas.
-- IMPORTANTE: este step deve rodar em janela quieta se o banco já tem
-- signups concorrentes — INSERT com avatar inválido entre sanitize e ADD
-- CONSTRAINT seria bloqueado pela constraint nova (não rolls back o resto,
-- mas o usuário do signup vê erro). Pra bootstrap em DB fresca é seguro.
update public.profiles
   set avatar_url = null
 where avatar_url is not null
   and (
     avatar_url !~* '^https://'
     or length(avatar_url) > 2048
     or avatar_url ~ '[[:cntrl:]]'
   );

alter table public.profiles
  drop constraint if exists profiles_avatar_url_https_or_null;
alter table public.profiles
  add constraint profiles_avatar_url_https_or_null
  check (
    avatar_url is null
    or (
      avatar_url ~* '^https://'
      and length(avatar_url) <= 2048
      and avatar_url !~ '[[:cntrl:]]'
    )
  )
  not valid;

-- ----------------------------------------------------------------------------
-- B7. Drop TODAS as UPDATE policies em invitations — RPC é o único path.
-- ----------------------------------------------------------------------------
-- accept_invitation é SECURITY DEFINER e ignora RLS. Nenhuma policy UPDATE
-- deve existir — qualquer caminho INVOKER bypassa a RPC e quebra a
-- invariante "accepted ⟹ membership existe".
-- DO block dinâmico cobre variantes com typo no nome da policy original.
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'invitations' and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.invitations', r.policyname);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- B8. assert_at_least_one_owner: serializa demoções concorrentes.
-- ----------------------------------------------------------------------------
-- Race: 2 transações demovendo owners diferentes da MESMA org em paralelo.
-- Cada uma lê count=2 (snapshot vê ambos owners), ambas demovem, total=0.
-- Fix: lock row da org via SELECT FOR UPDATE antes do count — serializa
-- todas as demoções de owners por org.
-- Mantém a lógica de cascade (org deletada ⇒ libera) do fix anterior.
create or replace function public.assert_at_least_one_owner()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.organizations where id = old.organization_id) then
    return old;
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    perform 1 from public.organizations where id = old.organization_id for update;
    if (
      select count(*) from public.memberships
      where organization_id = old.organization_id and role = 'owner'
    ) <= 1 then
      raise exception 'cannot leave organization without an owner';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

-- ----------------------------------------------------------------------------
-- B9. accept_invitation: race com mesmo user + emails diferentes.
-- ----------------------------------------------------------------------------
-- A versão anterior fazia SELECT v_existing → INSERT membership. Se o mesmo
-- auth user aceita 2 convites (orgs diferentes ou identities linkadas com
-- emails distintos) em paralelo, ambos veem v_existing=null, ambos tentam
-- INSERT, segundo falha no unique (org_id, user_id) e vaza schema interno
-- pro cliente (viola CLAUDE.md rule 6).
-- Fix: on conflict do update preserva o upgrade explícito member→admin
-- sem nunca lançar unique_violation.
create or replace function public.accept_invitation(_token text)
returns table(organization_id uuid, slug text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_invite public.invitations%rowtype;
  v_user_email text;
begin
  select lower(au.email) into v_user_email
  from auth.users au
  where au.id = auth.uid();

  if v_user_email is null then raise exception 'not authenticated'; end if;

  select * into v_invite from public.invitations where token = _token for update;
  if v_invite is null then raise exception 'invitation not found'; end if;
  if v_invite.role = 'owner' then raise exception 'invalid invitation role'; end if;
  if v_invite.accepted_at is not null then raise exception 'invitation already accepted'; end if;
  if v_invite.expires_at < now() then raise exception 'invitation expired'; end if;
  if lower(v_invite.email) <> v_user_email then raise exception 'invitation is for different email'; end if;

  update public.invitations set accepted_at = now() where id = v_invite.id;

  insert into public.memberships (organization_id, user_id, role)
  values (v_invite.organization_id, auth.uid(), v_invite.role)
  on conflict (organization_id, user_id) do update
    set role = case
      when public.memberships.role = 'member' and excluded.role = 'admin' then 'admin'::public.org_role
      else public.memberships.role
    end;

  return query select o.id, o.slug from public.organizations o where o.id = v_invite.organization_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- B10. ALTER pg_temp em todas as SECURITY DEFINER pré-existentes.
-- ----------------------------------------------------------------------------
-- CVE-2018-1058 hardening: search_path com pg_temp por último previne
-- shadow-attack via temp namespace. Defense-in-depth — `authenticated` no
-- Supabase não tem CREATE em pg_temp por padrão, mas alinha com PG best
-- practice e passa auditoria de segurança 3rd-party.
alter function public.is_org_member(uuid)
  set search_path = public, pg_temp;
alter function public.has_org_role(uuid, public.org_role[])
  set search_path = public, pg_temp;
alter function public.cleanup_org_logos_on_delete()
  set search_path = public, pg_temp;
alter function public.consume_llm_tokens(integer)
  set search_path = public, pg_temp;
alter function public.transfer_ownership(uuid, uuid)
  set search_path = public, pg_temp;
alter function public.current_user_email()
  set search_path = public, auth, pg_temp;
alter function public.create_organization_with_owner(text, text)
  set search_path = public, pg_temp;
