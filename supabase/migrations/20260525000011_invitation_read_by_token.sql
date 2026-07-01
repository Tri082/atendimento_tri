-- Permite usuários autenticados ler invitations.
-- Segurança vem do token: só quem tem o link sabe qual buscar.
-- Combinado com a checagem de email do user no acceptInvitationAction,
-- garante que só o destinatário aceita.
create policy "authenticated reads invitation by token"
  on public.invitations for select
  to authenticated
  using (true);
