# CLAUDE.md — lib/supabase

## Responsabilidade

Wrappers de Supabase client e padrões de acesso ao banco.

## Clients

- `client.ts` — `createClient()` browser-side (use em Client Components)
- `server.ts` — `createClient()` server-side (use em RSC, Server Actions, route handlers)
- `middleware.ts` — `updateSession()` refresca cookies (chamado em `middleware.ts` da raiz)

**NUNCA** importe `server.ts` em Client Components — quebra build.

## Padrão de query

Queries server-side ficam em pastas de domínio com sufixo `queries.ts` (ex: `lib/orgs/queries.ts`). Padrão:

```typescript
import { createClient } from "@/lib/supabase/server";

export async function getMyThings(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("my_things")
    .select("id, name, created_at")
    .eq("organization_id", orgId);
  if (error) throw error;
  return data ?? [];
}
```

- Sempre selecione colunas explicitamente (evite `select("*")`)
- Sempre verifique `error` antes de retornar `data`
- Use `.maybeSingle()` quando esperar 0 ou 1 resultado; `.single()` quando deve ter exatamente 1

## Como criar uma nova tabela escopada por org

1. Crie `supabase/migrations/YYYYMMDDHHmmss_<feature>.sql` (timestamp atual)
2. Use `_TEMPLATE_org_scoped_table.sql.example` como referência
3. Substitua `MY_TABLE` pelo nome da sua tabela (snake_case, plural)
4. Adicione suas colunas
5. Aplique a migration: cole no Supabase SQL Editor → Run
6. Rode `npm run types` pra regenerar `types/supabase.ts`
7. Commit a migration **junto** com `types/supabase.ts`

> Nota: o banco é montado por migrations sequenciais em `supabase/migrations/`. Não existe `schema.sql` consolidado — cada feature/fix é uma migration nova com timestamp maior que a última.

## Regras absolutas

### RLS

- **Toda tabela de domínio TEM `organization_id`** + `enable row level security` + 4 policies usando `is_org_member` / `has_org_role`
- **NÃO use `FORCE ROW LEVEL SECURITY`** — `ENABLE` é suficiente. `FORCE` causa recursão infinita com helpers `SECURITY DEFINER` que consultam a mesma tabela protegida
- **Nunca remova RLS de uma tabela existente** sem aprovação
- **Nunca bypassa RLS com `service_role_key`** pra "fazer funcionar"

### Helpers RLS (is_org_member, has_org_role)

Toda função SQL usada em policy DEVE ter:
- `security definer` — roda como dono da função
- `set search_path = public` — evita escalation via search_path mutation
- **`set row_security = off`** — OBRIGATÓRIO se a função consulta uma tabela com RLS habilitada que tem policy chamando essa MESMA função (recursão infinita: policy → função → tabela → policy → função → ...)

Modelo correto:

```sql
create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off    -- crítico, não remover
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = _org_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated, anon;
```

**IMPORTANTE — grant pra `anon` também é necessário.** A função já trata
`auth.uid()` nulo direito (`exists(...)` some vira `false`, não vaza nada),
mas se `anon` não tiver EXECUTE, qualquer policy de RLS que chama a função
(ou seja, quase toda tabela de domínio) quebra com erro real do Postgres
(`permission denied for function is_org_member`) assim que um visitante
deslogado esbarra numa dessas tabelas — não é um "sem acesso" silencioso,
derruba a página inteira (ex: página pública `/aceitar-convite` lendo
`invitations`). Corrigido em `20260714190000_grant_rls_helpers_to_anon.sql`.

### Triggers obrigatórios

- **`set_updated_at`** — toda tabela com coluna `updated_at`
- **`freeze_org_and_creator`** — toda tabela escopada por org (impede que membro malicioso mude `organization_id` ou `created_by` da própria linha)

### Service role key

**NUNCA** importe `SUPABASE_SERVICE_ROLE_KEY` em código que roda no browser. Só em Server Action quando há necessidade real (ex: criar user via Admin API). Bypass de RLS é último recurso.

## Convenções de naming SQL

- Tabelas: `snake_case`, plural (`organizations`, `memberships`, `invitations`)
- Colunas: `snake_case`, singular (`organization_id`, `created_at`)
- Foreign keys: `<tabela_singular>_id`
- Indexes: `<tabela>_<coluna>_idx`
- Policies: nome descritivo em inglês, lower-case, sem prefixo (ex: `"members read their orgs"`)

## Onde NÃO criar queries

- Em Client Components (use Server Action que internamente faz query)
- Em utilitários puros (sem `"use server"`) que rodam no client
