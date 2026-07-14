-- accept_invitation declara `returns table(organization_id uuid, slug text)`,
-- o que cria uma variável implícita `organization_id` dentro da função.
-- Isso colide com a coluna `organization_id` de `memberships` usada em
-- `on conflict (organization_id, user_id)` — Postgres não sabe se é a
-- variável de retorno ou a coluna, e lança "column reference organization_id
-- is ambiguous". Como o clause `on conflict (...)` exige nome de coluna sem
-- qualificador (não dá pra escrever `memberships.organization_id` ali),
-- a correção é a diretiva `#variable_conflict use_column`, que instrui a
-- função a sempre preferir a coluna da tabela quando há esse choque de nome
-- (nenhum lugar do corpo da função pretendia referenciar a variável de
-- retorno antes do `return query` final).
create or replace function public.accept_invitation(_token text)
returns table(organization_id uuid, slug text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
#variable_conflict use_column
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
