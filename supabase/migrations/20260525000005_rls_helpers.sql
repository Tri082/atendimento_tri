-- IMPORTANTE: `set row_security = off` é OBRIGATÓRIO nesses helpers.
-- Sem ele, quando uma policy de `memberships` chama is_org_member(), e a
-- função consulta memberships internamente, RLS dispara DE NOVO → chama o
-- helper → recursão infinita → "stack depth limit exceeded" (54001).
-- SECURITY DEFINER sozinho NÃO basta (o bypass de RLS pra owner não é
-- garantido se a função e a tabela tiverem owners diferentes — comum no
-- Supabase). row_security=off desativa RLS pra dentro da função explicitamente.
create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = _org_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(_org_id uuid, _roles public.org_role[])
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = _org_id
      and user_id = auth.uid()
      and role = any(_roles)
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;

