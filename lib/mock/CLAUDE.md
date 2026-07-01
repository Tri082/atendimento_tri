# CLAUDE.md — lib/mock

Dados de exemplo (seed in-memory) usados pelo dashboard pra mostrar UI cheia antes do aluno ter dados reais.

**Não é domínio CRUD.** Quando o aluno construir suas próprias funcionalidades, ele substitui essas funções por queries Supabase reais (ver `lib/tasks/` como referência).

Hoje só tem `dashboard.ts` — KPIs + sparklines + tabelas demo. Tudo determinístico (não usa `Math.random`) pra não causar hydration mismatch.

Se for adicionar mock novo: prefira deixar opt-in (página separada `/demo/...`) em vez de poluir telas reais.
