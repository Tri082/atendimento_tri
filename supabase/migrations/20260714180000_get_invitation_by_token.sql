-- A página de aceitar convite lê o convite (email/role/expires_at/accepted_at)
-- ANTES do usuário estar logado — é assim que a pessoa convidada, que ainda
-- não tem conta, descobre que foi convidada. Mas a RLS de `invitations` só
-- libera SELECT pra quem já é `authenticated` e cujo email bate com o do
-- convite (migration security_hardening_c) — não existe policy pra `anon`.
-- Resultado: convite válido aparecia como "Convite inválido" pra qualquer
-- pessoa que abrisse o link deslogada (o caso normal de quem nunca teve conta).
-- Essa função SECURITY DEFINER resolve o convite pelo token (mesmo padrão de
-- get_invitation_organization), sem depender de estar logado.
create or replace function public.get_invitation_by_token(_token text)
returns table(email text, role public.org_role, expires_at timestamptz, accepted_at timestamptz, organization_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select i.email, i.role, i.expires_at, i.accepted_at, i.organization_id
  from public.invitations i
  where i.token = _token;
$$;

revoke execute on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to authenticated, anon;
