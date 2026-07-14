-- is_org_member/has_org_role só tinham EXECUTE liberado pra `authenticated`.
-- Qualquer policy de RLS que usa essas funções (praticamente toda tabela de
-- domínio, ver CLAUDE.md regra 1) quebra com "permission denied for function
-- is_org_member" quando avaliada pra um request `anon` (usuário deslogado) —
-- não é um "não tem acesso" silencioso, é um ERRO do Postgres que derruba a
-- query inteira. Isso quebrava qualquer página pública que esbarrasse numa
-- tabela com RLS (ex: /aceitar-convite) assim que o visitante não tivesse
-- sessão.
--
-- As funções já tratam auth.uid() nulo corretamente (vira "não é membro",
-- sem vazar dado nenhum) — só faltava a permissão de chamar a função.
grant execute on function public.is_org_member(uuid) to anon;
grant execute on function public.has_org_role(uuid, public.org_role[]) to anon;
