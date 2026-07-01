-- ============================================================================
-- ============================================================================
-- Faz INSERT em organizations + INSERT em memberships(role=owner) na MESMA
-- transação. Se a segunda falha, o Postgres dá rollback automático e a org
-- nunca fica órfã (sem dono).
--
-- SECURITY DEFINER pra que o INSERT em memberships não precise da policy
-- "owners and admins create memberships" (que exigiria membership pré-
-- existente — circularidade impossível no primeiro insert).
-- ============================================================================
create or replace function public.create_organization_with_owner(_name text, _slug text)
returns table(id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_slug text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  if _name is null or length(_name) < 2 or length(_name) > 80 then
    raise exception 'invalid name';
  end if;
  if _slug is null then raise exception 'invalid slug'; end if;

  insert into public.organizations (name, slug, created_by)
  values (_name, _slug, auth.uid())
  returning organizations.id, organizations.slug into v_org_id, v_org_slug;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return query select v_org_id, v_org_slug;
end;
$$;

revoke execute on function public.create_organization_with_owner(text, text) from public, anon;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;

