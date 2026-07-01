# Patterns do template — copy-paste-ready

Snippets dos padrões mais usados no template. Quando Claude Code (ou aluno avançado) precisa de **forma exata** de algo, vem aqui antes de inventar.

Cada pattern lista: **quando usar**, **código pronto**, **referência viva** (arquivo do projeto onde ele já é usado), e **anti-padrão** quando relevante.

---

## 1. Server Action — shape de retorno

**Quando:** toda Server Action (`"use server"` no topo) que muda banco ou tem efeito colateral.

**Forma:**
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireOrgMember } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const inputSchema = z.object({
  orgSlug: z.string().min(1),
  // ... campos
});
type Input = z.infer<typeof inputSchema>;
type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function minhaAcaoAction(input: Input): Promise<Result<{ id: string }>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("minha_tabela")
    .insert({ organization_id: org.id, /* ... */ })
    .select("id")
    .single();

  if (error || !data) {
    logError("minha-feature.create", error);
    return { ok: false, error: "Não consegui criar. Tenta de novo." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/minha-rota`);
  return { ok: true, data: { id: data.id } };
}
```

**Referência viva:** `lib/contacts/actions.ts`, `lib/deals/actions.ts`, `lib/tasks/actions.ts` (todos seguem esse pattern).

**Anti-padrões:**
- Retornar `error.message` do Postgres direto pro aluno (vaza nome de constraint/coluna). Loga via `logError` server-side, retorna mensagem leiga.
- Throw em vez de `{ ok: false, error }`. Caller espera shape consistente.
- Esquecer `revalidatePath` — UI fica stale.

---

## 2. Botão com link (shadcn + base-ui)

**Quando:** botão visualmente que navega via `next/link`.

**Forma:**
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

<Button render={<Link href="/destino" />} nativeButton={false}>
  Texto do botão
</Button>
```

**Regra:** `nativeButton={false}` é **obrigatório** quando usa `render={<Link />}` — sem isso, base-ui renderiza `<button>` nested em `<a>` (HTML inválido) e gera warning runtime.

**Referência viva:** `app/(app)/app/[orgSlug]/inbox/empty-state.tsx`, `app/(app)/app/[orgSlug]/automacoes/page.tsx`.

**Anti-padrões:**
- `asChild` (padrão do shadcn original). Esse projeto usa `render`, não `asChild`.
- `<Link><Button>...</Button></Link>` (nest invertido).

---

## 3. Page Server-side com guard de org

**Quando:** toda page em `app/(app)/app/[orgSlug]/.../page.tsx`.

**Forma:**
```tsx
// Server Component (sem "use client")
import { notFound } from "next/navigation";
import { requireOrgMember } from "@/lib/auth/guards"; // ou requireOrgRole

export default async function MinhaPagina({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // Member: qualquer membro autenticado da org acessa
  const { org, user } = await requireOrgMember({ orgSlug });
  // OU Admin-only:
  // const { org } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });

  // ... data fetching
  // const data = await listMinhasCoisas(org.id);
  // if (!data) notFound();

  return <div>{/* ... */}</div>;
}
```

**Referência viva:** `app/(app)/app/[orgSlug]/contatos/page.tsx`, `app/(app)/app/[orgSlug]/automacoes/page.tsx`.

**Anti-padrões:**
- Esquecer `await params` (Next 16 — params são Promise).
- Acessar `supabase` direto sem `requireOrgMember` — sem guard, qualquer um vê qualquer coisa.

---

## 4. Supabase clients — qual usar quando

**3 clients diferentes:**

| Client | Onde | Sessão | RLS aplica? |
|---|---|---|---|
| `createClient` (browser) | `lib/supabase/client.ts` | Cookie do usuário | ✅ Sim |
| `createClient` (server) | `lib/supabase/server.ts` | Cookie via Next cookies() | ✅ Sim |
| `createServiceClient` | `lib/supabase/service.ts` | Service role key (bypass) | ❌ Não |

**Regras:**
- **Server Actions / Server Components:** `createClient` de `@/lib/supabase/server`
- **Client Components com Realtime:** `createClient` de `@/lib/supabase/client`
- **Background jobs, webhooks, workers, automation actions:** `createServiceClient` de `@/lib/supabase/service`

**CRÍTICO:** quando usa service client, RLS NÃO aplica. **TODA mutation precisa filtrar `organization_id` explícito**:

```ts
// Service client — RLS bypassed, MAS:
await supabase
  .from("contacts")
  .update({ name: "X" })
  .eq("id", contactId)
  .eq("organization_id", ctx.orgId); // ⚠️ OBRIGATÓRIO
```

**Referência viva:** `lib/automations/actions/create-contact.ts` (service), `lib/contacts/actions.ts` (server).

**Anti-padrão:** usar `createServiceClient` em código que roda no browser — **vaza service key**. Só em código server-only.

---

## 5. Schema Zod — quando NÃO usar `.default()`

**Regra:** Schema Zod que vira `useForm` (React Hook Form) **NÃO pode ter `.default()`** — quebra tipagem dos `defaultValues`.

**Errado:**
```ts
const schema = z.object({
  name: z.string(),
  active: z.boolean().default(false), // ❌ quebra useForm
});
```

**Certo:**
```ts
const schema = z.object({
  name: z.string(),
  active: z.boolean(), // sem default
});

// No useForm, passe defaults explicitamente:
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", active: false }, // ✅ aqui
});
```

**Exceção:** schemas que são SÓ pra validação backend (não passam por RHF) podem usar `.default()` livremente.

**Referência viva:** `lib/automations/schemas.ts` (sem default — usado em UI form).

---

## 6. Migration de tabela org-scoped

**Quando:** criar tabela nova que pertence à org.

**Forma:** copia `supabase/migrations/_TEMPLATE_org_scoped_table.sql.example` e ajusta. Pontos críticos:

```sql
-- 1. created_by → auth.users(id), não public.profiles(id)
created_by uuid references auth.users(id) on delete set null,

-- 2. ENABLE RLS (NÃO use FORCE — quebra helpers SECURITY DEFINER)
alter table public.minha_tabela enable row level security;

-- 3. Policies separadas por operation (não use `for all`)
create policy "minha_tabela: members read"
  on public.minha_tabela for select
  using (public.is_org_member(organization_id));

create policy "minha_tabela: admins insert"
  on public.minha_tabela for insert
  with check (
    public.has_org_role(organization_id, array['owner','admin']::public.org_role[])
    and auth.uid() = created_by  -- ⚠️ obrigatório no insert
  );

-- 4. Trigger updated_at
create trigger trg_minha_tabela_updated_at
  before update on public.minha_tabela
  for each row execute function public.set_updated_at();

-- 5. ⚠️ OBRIGATÓRIO: freeze trigger
create trigger minha_tabela_freeze_org_and_creator
  before update on public.minha_tabela
  for each row execute function public.freeze_org_and_creator();
```

**Por que:** sem freeze trigger, admin pode mover row pra outra org via UPDATE → vazamento cross-org.

**Referência viva:** `supabase/migrations/20260606000001_automations.sql`, `_TEMPLATE_org_scoped_table.sql.example`.

---

## 7. `after()` para work pós-response

**Quando:** trabalho assíncrono que não precisa bloquear o response (envio de email, emit de evento, fetch externo).

**Forma:**
```ts
import { after } from "next/server";
import { emitAfter } from "@/lib/automations/emit"; // se for emit automation

export async function minhaAcao(input): Promise<Result> {
  // ... lógica síncrona crítica + INSERT

  // Work pós-response — NÃO bloqueia o caller:
  after(() =>
    enviarEmailDeBoasVindas(data.id).catch((err) =>
      logError("welcome-email", err),
    ),
  );

  // Pra automation events, use o helper já pronto:
  emitAfter("contact-created", {
    orgId, triggerType: "contact.created", eventId: data.id, payload: { ... },
  });

  return { ok: true, data };
}
```

**Regras:**
- `after()` SÓ funciona dentro de Server Action / Route Handler / Server Component (request scope).
- **NÃO chame `after()` aninhado** (dentro de outro `after()`) — Next 16 engole silenciosamente.
- Sempre `.catch(logError)` no callback — exception em `after()` é invisível pro caller.

**Referência viva:** `lib/automations/emit.ts`, `lib/messaging/router.ts`.

**Anti-padrão:** colocar work crítico em `after()` — se servidor cair entre return e callback, work perde. Pra crítico, use job/queue.

---

## 8. Realtime subscribe (Client Component)

**Quando:** UI precisa atualizar ao vivo quando row do banco muda.

**Forma:**
```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MeuComponenteRealtime({ rowId }: { rowId: string }) {
  const [data, setData] = useState<MeuTipo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`row-${rowId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // ou "INSERT" | "UPDATE" | "DELETE"
          schema: "public",
          table: "minha_tabela",
          filter: `id=eq.${rowId}`,
        },
        (payload) => {
          setData(payload.new as MeuTipo);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [rowId]);

  return <div>{/* render data */}</div>;
}
```

**Regra:** tabela precisa estar em `supabase_realtime` publication. Adicionar via migration:
```sql
alter publication supabase_realtime add table public.minha_tabela;
```

**Referência viva:** `app/(app)/app/[orgSlug]/automacoes/[automationId]/_components/dry-run-panel.tsx`.

---

## 9. Erro leigo (não vazar Postgres)

**Regra:** **NUNCA** retornar `error.message` do Postgres direto pro aluno.

**Errado:**
```ts
if (error) return { ok: false, error: error.message }; // ❌ vaza "duplicate key value violates unique constraint contacts_email_unique"
```

**Certo:**
```ts
if (error) {
  logError("contacts.create", error); // técnico vai pro server log
  return {
    ok: false,
    error: "Esse email já tá cadastrado em outro contato.", // leigo pro aluno
  };
}
```

**Padrão de mapeamento por código Postgres:**
- `23505` (unique violation) → "Já existe um X com esse Y"
- `23503` (FK violation) → "Esse Y referenciado não existe"
- `23502` (NOT NULL) → "Campo Z é obrigatório"
- Resto → "Não consegui completar. Tenta de novo."

**Referência viva:** `lib/messaging/errors.ts` (mapeamento de WhatsApp Cloud errors).

---

## 10. Registry pattern (extensão declarativa)

**Quando:** sistema onde aluno pode adicionar variantes (canais novos, ações novas, tipos novos) sem mudar core.

**Forma:**

```ts
// 1. Interface compartilhada
export interface MinhaThingDefinition {
  id: string;
  label: string;
  // ... shape comum
}

// 2. Cada variante num arquivo separado
// minhas-things/foo.ts
export const fooThing: MinhaThingDefinition = { id: "foo", label: "Foo", /* ... */ };

// 3. Registry agrega
// registry.ts
import { fooThing } from "./things/foo";
import { barThing } from "./things/bar";

export const THINGS: Record<string, MinhaThingDefinition> = {
  foo: fooThing,
  bar: barThing,
};

export function listThings() { return Object.values(THINGS); }
export function getThing(id: string) { return THINGS[id]; }
```

**Vantagem pro Claude Code:** abre 1 arquivo (`registry.ts`) e sabe TUDO que existe + onde encontrar cada um.

**Pra adicionar variante nova:** criar arquivo + adicionar no registry. Sem mexer no core.

**Referência viva:**
- `lib/automations/registry.ts` (7 triggers + 14 actions)
- `lib/messaging/registry.ts` (adapters de canal)
- `lib/agent/tools/index.ts` (tools do agente)

---

## 11. Service-level helper em código com `after()` ou setInterval

**Quando:** worker / cron / background job que NÃO tem sessão de usuário, mas precisa fazer ação que normalmente é Server Action.

**Problema:** Server Action exige `requireOrgMember` que usa cookies → não funciona em worker.

**Forma:** criar helper service-level paralelo, sem guard de sessão:

```ts
// lib/messaging/router.ts — helper pra worker/automation
export async function sendMessageToConversation(params: {
  orgId: string;
  conversationId: string;
  text: string;
}): Promise<{ messageId: string }> {
  const supabase = createServiceClient(); // sem session
  // ... INSERT
}
```

**Caller (Server Action) ainda usa guard:**
```ts
export async function sendMessageAction(input) {
  const { org } = await requireOrgMember({ orgSlug: input.orgSlug });
  // ... valida, e depois delega pro helper:
  return sendMessageToConversation({ orgId: org.id, ... });
}
```

**Vantagem:** worker e Server Action compartilham lógica; só o guard muda.

**Referência viva:** `lib/messaging/router.ts:sendMessageToConversation` (usado por `lib/automations/actions/send-whatsapp-message.ts`).

---

## 12. Verificação obrigatória antes de "feito"

**Comandos que toda mudança em código DEVE passar:**

```bash
npx tsc --noEmit       # 0 erros TypeScript
npm run build          # build de produção verde
npm run test           # se mexeu em testes
```

**Pra UI/feature visível:** abra dev server e teste no browser. `npx tsc --noEmit` valida tipo, não comportamento.

**Pra migration:** aplica em dev ANTES de prod. `supabase/reset-dev.sql` reseta banco dev.

---

## Quick reference dos comandos npm

- `npm run dev` — server local em http://localhost:3000
- `npm run build` — build produção
- `npm run check` — Biome lint + format (com fix)
- `npm run types` — regenera `types/supabase.ts` (precisa `SUPABASE_PROJECT_ID`)
- `npm run test` — Vitest
- `npm run test <path>` — testar arquivo/pasta específica

---

## Quando estiver perdido

1. **Lê o `CLAUDE.md` raiz** — convenções gerais
2. **Lê o `CLAUDE.md` do subsistema** (`lib/<dominio>/CLAUDE.md`)
3. **Olha referência viva** — `lib/tasks/` pra CRUD, `lib/messaging/router.ts` pra event flow
4. **Pergunta ao aluno** antes de adivinhar — escolhas erradas viram débito que ele não diagnostica
