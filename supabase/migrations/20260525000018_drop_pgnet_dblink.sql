-- Drop de extensões não utilizadas pelo template (pg_net, dblink).
-- Supabase pré-instala ambas com EXECUTE para authenticated/anon, o que
-- amplia a superfície de ataque (HTTP egress / port scan) sem benefício
-- pra um template SaaS. Se você precisar delas no seu app, reinstale.
drop extension if exists pg_net cascade;
drop extension if exists dblink cascade;
