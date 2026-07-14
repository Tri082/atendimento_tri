-- A página de aceitar convite precisa mostrar o nome da organização pra
-- quem ainda NÃO é membro dela (esse é o objetivo do convite) — mas a RLS
-- de `organizations` só libera leitura pra quem já é membro ou criador.
-- Isso fazia o join `organizations(name, slug)` voltar null e a página
-- quebrar tentando ler `org.name`. Essa função SECURITY DEFINER resolve
-- nome/slug pelo token do convite, sem exigir ser membro.
create or replace function public.get_invitation_organization(_token text)
returns table(name text, slug text)
language sql
security definer
stable
set search_path = public
as $$
  select o.name, o.slug
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = _token;
$$;

revoke execute on function public.get_invitation_organization(text) from public;
grant execute on function public.get_invitation_organization(text) to authenticated, anon;
