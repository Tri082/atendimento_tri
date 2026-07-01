-- ============================================================================
-- ============================================================================
-- consume_llm_tokens com cap hardcoded e validação de _tokens
drop function if exists public.consume_llm_tokens(integer, integer);

create or replace function public.consume_llm_tokens(_tokens integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_cap constant int := 50000;
begin
  if auth.uid() is null then return false; end if;
  if _tokens is null or _tokens <= 0 or _tokens > 100000 then
    raise exception 'invalid token count';
  end if;
  insert into public.llm_usage (user_id, day, tokens_used)
  values (auth.uid(), current_date, _tokens)
  on conflict (user_id, day) do update
    set tokens_used = llm_usage.tokens_used + excluded.tokens_used
  returning tokens_used into v_current;
  return v_current <= v_cap;
end;
$$;

revoke execute on function public.consume_llm_tokens(integer) from public, anon;
grant execute on function public.consume_llm_tokens(integer) to authenticated;

alter table public.llm_usage
  add constraint llm_usage_tokens_nonneg check (tokens_used >= 0);

-- transfer_ownership com _org_id explícito
drop function if exists public.transfer_ownership(uuid);

create or replace function public.transfer_ownership(_org_id uuid, _target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_membership public.memberships%rowtype;
  v_target_membership public.memberships%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = _target_user_id then raise exception 'cannot transfer to self'; end if;

  select * into v_caller_membership
  from public.memberships
  where organization_id = _org_id and user_id = auth.uid() and role = 'owner'
  for update;

  if v_caller_membership is null then
    raise exception 'caller is not owner of this organization';
  end if;

  select * into v_target_membership
  from public.memberships
  where organization_id = _org_id and user_id = _target_user_id
  for update;

  if v_target_membership is null then
    raise exception 'target is not a member of this organization';
  end if;

  update public.memberships set role = 'owner' where id = v_target_membership.id;
  update public.memberships set role = 'admin' where id = v_caller_membership.id;
end;
$$;

revoke execute on function public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- cleanup_org_logos_on_delete usa set_config pra contornar
-- storage.protect_delete() do Supabase
create or replace function public.cleanup_org_logos_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
  where bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = old.id::text;
  return old;
end;
$$;

-- policies de invitations leem auth.users.email via helper
-- SECURITY DEFINER (authenticated não tem SELECT direto em auth.users).
create or replace function public.current_user_email()
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select lower(au.email) from auth.users au where au.id = auth.uid();
$$;

revoke execute on function public.current_user_email() from public, anon;
grant execute on function public.current_user_email() to authenticated;

drop policy if exists "users read invitations addressed to them" on public.invitations;
create policy "users read invitations addressed to them"
  on public.invitations for select
  to authenticated
  using (lower(email) = public.current_user_email());

drop policy if exists "users mark own invitation accepted" on public.invitations;
create policy "users mark own invitation accepted"
  on public.invitations for update
  to authenticated
  using (lower(email) = public.current_user_email())
  with check (lower(email) = public.current_user_email());

-- invitations.role não pode ser 'owner' (defesa-em-profundidade)
alter table public.invitations
  add constraint invitations_role_not_owner check (role in ('admin', 'member'));

drop policy if exists "owners and admins create invitations" on public.invitations;
create policy "owners and admins create invitations"
  on public.invitations for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['owner','admin']::public.org_role[])
    and role <> 'owner'
  );

-- accept_invitation: refuta role='owner', lê auth.users.email, upgrade explícito
-- só de member -> admin (nunca downgrade silencioso)
create or replace function public.accept_invitation(_token text)
returns table(organization_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invitations%rowtype;
  v_user_email text;
  v_existing public.memberships%rowtype;
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

  select * into v_existing from public.memberships
  where organization_id = v_invite.organization_id and user_id = auth.uid();

  if v_existing is null then
    insert into public.memberships (organization_id, user_id, role)
    values (v_invite.organization_id, auth.uid(), v_invite.role);
  else
    -- Upgrade explícito: só member -> admin. Nunca downgrade. Owner permanece.
    if v_existing.role = 'member' and v_invite.role = 'admin' then
      update public.memberships set role = 'admin' where id = v_existing.id;
    end if;
  end if;

  return query select o.id, o.slug from public.organizations o where o.id = v_invite.organization_id;
end;
$$;

