-- ============================================================================
-- ============================================================================
-- ----------------------------------------------------------------------------
-- Storage SELECT policies: remover bypass `auth.role()='authenticated'`
-- ----------------------------------------------------------------------------
drop policy if exists "org-logos read by members" on storage.objects;
create policy "org-logos read by members only"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

-- ----------------------------------------------------------------------------
-- Bucket org-logos vira privado — callers usam createSignedUrl.
-- ----------------------------------------------------------------------------
update storage.buckets set public = false where id = 'org-logos';

-- ----------------------------------------------------------------------------
-- Memberships INSERT policy: admin NÃO pode criar role='owner'
-- ----------------------------------------------------------------------------
drop policy if exists "owners and admins create memberships" on public.memberships;

create policy "owners create any membership"
  on public.memberships for insert
  with check (public.has_org_role(organization_id, array['owner']::public.org_role[]));

create policy "admins create non-owner memberships"
  on public.memberships for insert
  with check (
    public.has_org_role(organization_id, array['admin']::public.org_role[])
    and role <> 'owner'
  );

-- ----------------------------------------------------------------------------
-- Trigger garante pelo menos 1 owner por org
-- ----------------------------------------------------------------------------
create or replace function public.assert_at_least_one_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Se a org tá sendo deletada (cascade), o invariante "1 owner" não importa
  -- — a org não existirá mais. Sem isso, deletar uma org com 1 owner falha
  -- porque o cascade tenta remover a membership do dono e o trigger bloqueia.
  if tg_op = 'DELETE'
     and not exists (
       select 1 from public.organizations where id = old.organization_id
     ) then
    return old;
  end if;

  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    if (
      select count(*)
      from public.memberships
      where organization_id = old.organization_id and role = 'owner'
    ) <= 1 then
      raise exception 'cannot leave organization without an owner';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists memberships_assert_owner on public.memberships;
create trigger memberships_assert_owner
  before update or delete on public.memberships
  for each row execute function public.assert_at_least_one_owner();

-- ----------------------------------------------------------------------------
-- RPC atômica para accept invitation (substitui claim+insert em duas etapas)
-- ----------------------------------------------------------------------------
create or replace function public.accept_invitation(_token text)
returns table(organization_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invitations%rowtype;
  v_user_email text;
begin
  v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_user_email = '' then
    raise exception 'not authenticated';
  end if;

  -- Lock + read
  select * into v_invite
  from public.invitations
  where token = _token
  for update;

  if v_invite is null then
    raise exception 'invitation not found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invitation already accepted';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invitation expired';
  end if;
  if lower(v_invite.email) <> v_user_email then
    raise exception 'invitation is for different email';
  end if;

  -- Marca invite como aceito
  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  -- Insere membership (idempotente — se já existe não faz nada)
  insert into public.memberships (organization_id, user_id, role)
  values (v_invite.organization_id, auth.uid(), v_invite.role)
  on conflict (organization_id, user_id) do nothing;

  -- Retorna info pra UI redirecionar
  return query
    select o.id, o.slug
    from public.organizations o
    where o.id = v_invite.organization_id;
end;
$$;

revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Garantia: helpers RLS continuam SECURITY DEFINER + row_security=off.
-- ----------------------------------------------------------------------------
-- Tentativa anterior trocou pra INVOKER, mas a policy `members read
-- memberships of their orgs` chama `is_org_member`, que internamente
-- consulta `memberships` — sob INVOKER + row_security=off isso lança
-- erro 42501 ("query would be affected by row-level security policy").
-- Re-afirma DEFINER como defesa caso alguém tente alterar manualmente.
alter function public.is_org_member(uuid) security definer;
alter function public.has_org_role(uuid, public.org_role[]) security definer;

-- ----------------------------------------------------------------------------
-- Cleanup de storage org-logos após delete da organização
-- ----------------------------------------------------------------------------
create or replace function public.cleanup_org_logos_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
  where bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = old.id::text;
  return old;
end;
$$;

drop trigger if exists organizations_cleanup_logos on public.organizations;
create trigger organizations_cleanup_logos
  after delete on public.organizations
  for each row execute function public.cleanup_org_logos_on_delete();

-- ----------------------------------------------------------------------------
-- Bloquear revoke de invitation já aceito (preserva auditoria)
-- ----------------------------------------------------------------------------
drop policy if exists "owners and admins delete invitations" on public.invitations;
create policy "owners and admins delete unaccepted invitations"
  on public.invitations for delete
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.org_role[])
    and accepted_at is null
  );

-- ----------------------------------------------------------------------------
-- Defesa-em-profundidade: case-insensitive uniqueness em invitations
-- ----------------------------------------------------------------------------
-- A unique do schema original foi declarada inline em invitations (migration
-- 20260525000004), o que cria uma CONSTRAINT — o índice de mesmo nome só
-- existe pra sustentar a constraint. Por isso tem que dropar a constraint
-- primeiro (o índice cai junto), e só depois rodar drop index como safety
-- net (no-op se a constraint existir, salva se alguém recriou só o índice).
alter table public.invitations
  drop constraint if exists invitations_organization_id_email_key;
drop index if exists invitations_organization_id_email_key;
create unique index invitations_org_email_lower_key
  on public.invitations(organization_id, lower(email));

