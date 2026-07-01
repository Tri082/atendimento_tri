-- freeze_messaging_org() é função de TRIGGER, não deve ser exposta como RPC.
-- Postgres por padrão concede EXECUTE pra PUBLIC; aqui revogamos pra fechar
-- a porta. Sem isso, /rest/v1/rpc/freeze_messaging_org responderia a qualquer
-- request anônimo (com erro, mas a função fica "visível").
revoke execute on function public.freeze_messaging_org() from public, anon, authenticated;
