-- Sobe o default de daily_token_cap em `agents` de 200.000 pra 10.000.000.
-- Motivo: alunos ficavam travando o "Agente Principal" auto-criado em orgs
-- novas porque a cota de 200k é insuficiente pra testes reais. O trigger
-- ensure_default_agent_for_new_org INSERTa sem especificar a coluna, então
-- pega o default daqui.
--
-- Agentes existentes mantêm o valor atual (ALTER COLUMN ... SET DEFAULT só
-- afeta INSERTs futuros).

alter table public.agents
  alter column daily_token_cap set default 10000000;
