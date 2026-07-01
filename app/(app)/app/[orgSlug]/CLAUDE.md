# CLAUDE.md — app/[orgSlug]

## Responsabilidade

Todas as rotas autenticadas e escopadas por organização. Toda página aqui dentro:

1. Recebe `params.orgSlug` na assinatura
2. Chama `requireOrgMember({ orgSlug })` (ou `requireOrgRole`) na primeira linha
3. Renderiza UI dentro do `AppLayout` (já aplicado automaticamente pelo `layout.tsx`)

## Estrutura padrão de uma página (listagem)

```tsx
import { requireOrgMember } from "@/lib/auth/guards";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Título em PT-BR" };

export default async function MyPage({ params }: Props) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireOrgMember({ orgSlug });

  // Buscar dados (queries do domínio):
  // const things = await getMyThings(org.id);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ meu-recurso</span>
        <h1 className="font-semibold text-3xl tracking-tight">Título</h1>
        <p className="text-muted-foreground text-sm">Descrição curta.</p>
      </div>
      {/* conteúdo */}
    </div>
  );
}
```

## Padrão de página de DETALHE (`[id]/page.tsx`)

Toda entidade (contato, produto, tarefa) que tem listagem normalmente tem detalhe.
Convenção: `/<entidade>/[id]/page.tsx`.

```tsx
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgMember } from "@/lib/auth/guards";
import { getThing } from "@/lib/things/queries";

type Props = { params: Promise<{ orgSlug: string; id: string }> };

export default async function ThingDetailPage({ params }: Props) {
  const { orgSlug, id } = await params;
  const { org } = await requireOrgMember({ orgSlug });
  const thing = await getThing(org.id, id);
  if (!thing) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <Button
        render={<Link href={`/app/${orgSlug}/things`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Voltar
      </Button>

      <div className="space-y-1.5">
        <span className="label-mono">/ thing #{thing.id.slice(0, 8)}</span>
        <h1 className="font-semibold text-3xl tracking-tight">{thing.name}</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ detalhes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* form de edição em client component separado */}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Padrão de DataTable (listagens)

Para listas com sort/filter/paginate, use `<DataTable>` de `@/components/app/data-table`. **Atenção:** colunas precisam ser definidas em **Client Component** porque usam `flexRender` e podem ter hooks.

Padrão: separa em 3 arquivos:
- `page.tsx` (Server Component) — busca dados, passa pra `<ThingsTable>`
- `things-table.tsx` (Client Component) — wrapper do `<DataTable>` com columns
- `thing-columns.tsx` (Client Component) — exporta `getThingColumns(orgSlug)`

```tsx
// things-table.tsx
"use client";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { getThingColumns } from "./thing-columns";

export function ThingsTable({ orgSlug, things }: Props) {
  return (
    <DataTable
      columns={getThingColumns(orgSlug)}
      data={things}
      searchColumn="name"
      empty={<EmptyState title="Vazio" description="Adicione o primeiro." />}
    />
  );
}
```

## Como criar uma nova página (checklist)

1. Crie pasta dentro de `app/(app)/app/[orgSlug]/` (ex: `clientes/`)
2. Crie `page.tsx` Server Component que chama `requireOrgMember` + queries
3. Se for listagem: crie `<feature>-table.tsx` Client Component + `<feature>-columns.tsx`
4. Se tem detalhe: crie `[id]/page.tsx` e `[id]/<feature>-detail-form.tsx`
5. Para criar/editar: dialog (`<NewFeatureDialog>`) ou rota separada (`/new/page.tsx`)
6. Adicione item em `config/nav.config.ts` se a feature precisa de link
7. Se for página admin only, use `requireOrgRole({ orgSlug, roles: ['owner', 'admin'] })`

## Padrão de Server Action consumido pela página

- Action fica em `lib/<dominio>/actions.ts` com `"use server"` no topo
- Form Client chama via `useTransition` + toast pra erro
- Action retorna `{ ok: true; data?: T } | { ok: false; error: string }`

## Layout

O `layout.tsx` desta pasta já fornece:
- `SidebarProvider` (com toggle)
- `AppSidebar` (com OrgSwitcher + nav)
- `AppHeader` (com theme toggle + user dropdown)
- `<main className="flex-1 p-6">` envolvendo `{children}`

Você **não precisa** adicionar header/sidebar em páginas filhas. Só foca no conteúdo.

## Convenções de UI

- Página começa com `<div className="space-y-8">` (listagem) ou `<div className="max-w-2xl space-y-8">` (form-focused)
- Header da página: bloco com `<span className="label-mono">/ recurso</span>` + `<h1 className="font-semibold text-3xl tracking-tight">`
- Cards: `<Card>` com `<CardHeader className="border-b border-border/60 bg-card/40 py-3">` e `<CardTitle className="label-mono text-[10px]">/ secao</CardTitle>`
- Botões: variantes default/outline/ghost/destructive — `Button` do shadcn
- Toasts: `import { toast } from "sonner"` (success e error)
- Empty state: `<EmptyState>` de `@/components/app/empty-state`
- **Link dentro de Button:** `<Button render={<Link href="..." />} nativeButton={false}>Texto</Button>` (base-ui pattern; `nativeButton={false}` necessário pq Link renderiza `<a>`)

## Quando precisar criar UM novo componente reutilizável

Decisão simples:
- **Reutilizável globalmente?** → `components/app/<nome>.tsx`
- **Usado só nessa página?** → mesmo diretório da `page.tsx`, com sufixo descritivo (ex: `client-table.tsx`)
- **Primitive shadcn que falta?** → `npx shadcn@latest add <componente>`

## Multi-agentes IA

Rotas em `/settings/agents`:

- `/settings/agents` — lista de agentes da org com status, canais conectados, uso hoje
- `/settings/agents/new` — criar novo agente (3 campos: nome, tom, cota)
- `/settings/agents/[agentId]?tab=config|knowledge|runs` — detalhe com tabs (estado da tab via query param `?tab=`)
- `/settings/agent` — redirect histórico pra `/settings/agents` (mantém links antigos funcionando)

Cada agente tem KB isolada (FAQs + PDFs amarrados em `agent_id`). Canal aponta pra um agente via `channels.agent_id`. Trigger no banco cria "Agente Principal" automaticamente em orgs novas.
