-- ============================================================================
-- ============================================================================
-- Implementa cap diário de tokens por user_id pra limitar custo do chat IA.
-- ============================================================================
create table public.llm_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  tokens_used integer not null default 0,
  primary key (user_id, day)
);

create index llm_usage_day_idx on public.llm_usage(day);

-- RLS habilitada como defesa-em-profundidade. A função consume_llm_tokens é
-- SECURITY DEFINER, então acessa a tabela bypassando RLS internamente. Sem
-- policy, nenhum client consegue ler direto — o que é o desejado.
alter table public.llm_usage enable row level security;

