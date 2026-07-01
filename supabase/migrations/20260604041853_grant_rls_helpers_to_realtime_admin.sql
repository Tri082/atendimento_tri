-- Realtime roda `apply_rls` com o role `supabase_realtime_admin` pra decidir
-- quais subscribers podem ver cada evento publicado. Sem EXECUTE nos helpers
-- de RLS, o apply_rls explode com `permission denied for function ...` e
-- nenhum evento sai pro client — subscribe fica SUBSCRIBED mas zero payload.
grant execute on function public.is_org_member(uuid) to supabase_realtime_admin;
grant execute on function public.has_org_role(uuid, public.org_role[]) to supabase_realtime_admin;
