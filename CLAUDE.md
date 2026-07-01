# CLAUDE.md — Elite da IA - Template

Esse arquivo orienta o Claude Code quando ele trabalha neste projeto.

## O que é esse projeto

Template SaaS multi-tenant em Next.js 16 + Supabase. Feito pra alunos do curso de Claude Code (público **leigo**) criarem seus próprios produtos (agentes IA, CRM, ERP, etc.).

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **Banco:** Supabase Cloud (PostgreSQL + RLS + Auth + Storage)
- **UI:** shadcn/ui (base-nova preset, sobre `@base-ui/react`) + Tailwind CSS 4 (CSS variables, tema dark com accent verde Kawasaki)
- **Forms:** React Hook Form + Zod + componentes shadcn Form (wrapper em `components/forms/`)
- **Data:** Server Components + Server Actions (sem TanStack Query nesta versão)
- **Charts:** Recharts via shadcn/ui Chart
- **Lint/Format:** Biome
- **Package manager:** npm

## Vocabulário leigo (NÃO IGNORE)

O aluno **não codifica**. Toda mensagem visível pra ele em PT-BR coloquial. Jargão técnico SÓ em código e comentários técnicos.

| Em vez de | Use |
|---|---|
| "schema" | "tabela do banco" |
| "Server Action" | "função do servidor" |
| "RSC / Server Component" | "página" |
| "hydration mismatch" | "o servidor mostrou uma coisa e o navegador esperava outra" |
| "TypeError" | "o código tentou usar uma variável que estava vazia" |
| "PostgREST error / RLS denied" | "a regra de segurança do banco bloqueou essa consulta" |

## Como o aluno pede coisas

Aluno fala em PT-BR coloquial em linguagem natural ("quero planejar uma feature de leads", "esse botão não tá funcionando", "revisa o que mudei"). Use as **skills do superpowers** correspondentes:

| Aluno pede... | Use skill |
|---|---|
| Brainstorm/plano antes de codar | `superpowers:brainstorming` + `writing-plans` |
| Construir feature nova | `superpowers:writing-plans` + `executing-plans` |
| Debug / "isso não funciona" | `superpowers:systematic-debugging` |
| Code review do diff | `superpowers:requesting-code-review` |
| Validar que algo funciona (com evidência) | `superpowers:verification-before-completion` |

**Sempre responda em PT-BR coloquial** independente do idioma da skill. Use o vocabulário leigo da próxima seção.

## Convenções

1. **PT-BR em UI / docs / mensagens.** Código (vars, funções, arquivos, tabelas, colunas) em inglês.
2. **Arquivos:** kebab-case. **Componentes React:** PascalCase. **Vars/funções:** camelCase. **Tabelas/colunas:** snake_case.
3. **Toda página em `/app/[orgSlug]/` começa com `requireOrgMember`** (ou `requireOrgRole`). Ver `lib/auth/CLAUDE.md`.
4. **Server Actions retornam `{ ok: true; data?: T } | { ok: false; error: string }`.** Nunca jogue exception sem tratamento.
5. **Padrão de slot do shadcn aqui é `render={<X />}`**, NÃO `asChild`:
   ```tsx
   <Button render={<Link href="/x" />}>Texto</Button>
   ```

## Regras absolutas (violar = bug crítico)

### Banco / segurança
1. **Toda tabela de domínio tem `organization_id`** + RLS habilitada + policies usando `is_org_member` / `has_org_role`. Sem exceção. Ver `lib/supabase/CLAUDE.md`.
2. **NÃO usar `FORCE ROW LEVEL SECURITY`** — causa recursão infinita com helpers SECURITY DEFINER. `ENABLE` é suficiente.
3. **Helpers RLS (`is_org_member`, `has_org_role`) usam `security definer` + `set row_security = off`** — sem o segundo, recursão infinita. Ver `lib/supabase/CLAUDE.md`.
4. **`SUPABASE_SERVICE_ROLE_KEY` nunca em código que roda no browser.** Só em Server Actions com necessidade extrema.
5. **Todo input do aluno valida com Zod** antes de tocar banco.
6. **Server Actions NUNCA retornam `error.message` direto** do Postgres/Supabase — traduz pra mensagem leiga, loga server-side com `console.error`. Evita vazamento de schema interno.
7. **Uploads validam por MIME (magic bytes)**, não pela extensão do `file.name`.
8. **Aprovação humana antes de migrations destrutivas** (drop column, drop table).

### Auth
9. **Senhas mínimo 10 caracteres** (definido em `lib/auth/schemas.ts`).
10. **Signup nunca confirma se email já existe** — retorna sucesso genérico (evita user enumeration).
11. **Redirects pós-auth validam o `next` param** contra `//evil.com`, encoded variants (usa `safeNext`).

### React + Next.js
12. **Server vs Client boundary é real.** Hooks (`useState`, `useEffect`, `useTransition`) e event handlers (`onClick`) só funcionam em Client Component (`"use client"` no topo).
13. **Schema Zod com `.default()` quebra tipagem do `useForm`** — não use `.default()` em schemas usados por RHF.
14. **`<Button render={<Link />}>` precisa `nativeButton={false}`** (base-ui pattern).
15. **`page.tsx` é Server.** Componentes interativos vão em `*-form.tsx`, `*-table.tsx` com `"use client"`.

### TypeScript
16. **NUNCA use `any`.** Se não souber o tipo, pergunte ou pesquise.
17. **NUNCA `@ts-ignore` / `@ts-expect-error`** sem comentário explicando.
18. **Tipos do Supabase vêm de `types/supabase.ts`** — após mudar schema, rode `npm run types`.

## Verificação obrigatória antes de dizer "feito"

Toda mudança em código DEVE passar:

```bash
npx tsc --noEmit   # 0 erros
npm run build      # build completa
```

Se a feature muda comportamento visível: peça pro aluno abrir e validar, ou use Playwright MCP se disponível. **Não afirme "funciona" sem evidência** — use `superpowers:verification-before-completion`.

Se tocou testes: `npm run test` verde.

## Anti-padrões (PROIBIDO)

- ❌ "Acho que tá funcionando" sem rodar typecheck + build
- ❌ Try/catch só pra esconder erro
- ❌ Comentar código pra "ver se resolve"
- ❌ Atualizar dependência random pra "ver"
- ❌ Deixar `console.log` no código depois de debugar
- ❌ Mudar 3 coisas pra debugar 1 bug
- ❌ Aplicar fix em produção sem testar em dev
- ❌ Push pra main sem permissão explícita do aluno

## Escalar pro aluno (parar e perguntar)

Pare e devolve a decisão pro aluno quando:
- Decisão de design com múltiplas opções válidas
- Mudança em tabela existente (risco de perder dado)
- Feature precisa de pacote npm grande (Stripe, integrações externas)
- Feature precisa de chave/config externa
- Você fez 3+ tentativas e não convergiu
- O pedido viola alguma regra absoluta acima

**Escalar não é falha — é disciplina.** Bad work > no work.

## Comandos npm

- `npm run dev` — server local em http://localhost:3000
- `npm run build` — build de produção
- `npm run check` — Biome lint + format (com fix)
- `npm run types` — regenera `types/supabase.ts` do schema remoto (precisa `SUPABASE_PROJECT_ID` no env)
- `npm run test` — testes Vitest

## Estrutura

```
app/                              # Rotas Next.js
  (marketing)/                    # Públicas (landing)
  (auth)/                         # Login, signup, reset
  (app)/                          # Autenticado
    onboarding/                   # Criar primeira org
    app/[orgSlug]/                # Escopado por org
      dashboard/
      settings/
      tarefas/                    # Demo CRUD completo (referência viva)
  auth/callback/                  # OAuth/email callback
lib/
  supabase/                       # Clients + middleware
  auth/                           # Guards + actions + schemas
  orgs/                           # Queries + actions de organizações
  profile/                        # Update profile
  tasks/                          # Domain da demo de tarefas (referência)
  contacts/, companies/, deals/   # CRUDs do CRM (mesmo padrão de tasks)
  invitations/, members/          # Domínios de convite e gestão de membros
  email/                          # Provider abstrato + adapters
  llm/                            # Provider abstrato pra Anthropic/OpenAI
  messaging/                      # Inbox multi-canal (router + adapters) — Sub-A/B/C
  agent/                          # Agente IA (RAG + tool use + handoff) — Sub-D
  automations/                    # Automações event-based (Sub-H)
  jobs/                           # Background jobs (recoveries via instrumentation.ts)
  mock/                           # Seed data do dashboard (substituir por queries reais)
components/
  ui/                             # shadcn primitives
  app/                            # Shell (Sidebar, Header, OrgSwitcher...)
  forms/                          # Helpers RHF (TextField)
  providers/                      # ThemeProvider
supabase/
  migrations/                     # Migrations SQL aplicadas em ordem (bootstrap + features novas)
  reset-dev.sql                   # Zera o banco em dev pra reaplicar tudo do zero
types/supabase.ts                 # Tipos gerados do banco
middleware.ts                     # Refresca sessão + redirect público/privado
config/
  app.config.ts                   # Nome/branding do app
  nav.config.ts                   # Itens do sidebar
.claude/
  commands/                       # Slash commands custom
```

## Patterns de copy-paste

Pra **forma exata** de Server Action, Page com guard, Realtime, Migration org-scoped, etc — consulta primeiro:
- `docs/patterns.md` — 12 padrões copy-paste-ready com referência viva pra cada

## CLAUDE.md filhos (consulte conforme contexto)

**Infra:**
- `lib/auth/CLAUDE.md` — guards, proteção de rota, regras de senha/redirect
- `lib/supabase/CLAUDE.md` — queries, migrations, padrão de tabela org-scoped, regras de helpers RLS
- `lib/email/CLAUDE.md` — envio de email (provider abstrato + adapters)
- `lib/llm/CLAUDE.md` — adapters Anthropic/OpenAI
- `lib/jobs/CLAUDE.md` — background jobs (recoveries) + por que `instrumentation.ts`

**Subsistemas grandes:**
- `lib/messaging/CLAUDE.md` — inbox multi-canal, router, adapters, WhatsApp (Sub-A/B/C)
- `lib/agent/CLAUDE.md` — agente IA, RAG, tools, handoff, cost cap (Sub-D)
- `lib/automations/CLAUDE.md` — automações event-based (Sub-projeto H)

**Domínios CRUD** (todos seguem o padrão de `lib/tasks/`):
- `lib/contacts/CLAUDE.md`, `lib/companies/CLAUDE.md`, `lib/deals/CLAUDE.md`
- `lib/orgs/CLAUDE.md`, `lib/profile/CLAUDE.md`
- `lib/tags/CLAUDE.md` — catálogo universal de tags com escopo + propagação (segmentação CRM + estado de conversa)
- `lib/invitations/CLAUDE.md`, `lib/members/CLAUDE.md`
- `lib/mock/CLAUDE.md` — seed data do dashboard (não é CRUD real)

**UI:**
- `components/CLAUDE.md` — onde criar componentes + padrões base-ui + estilo visual
- `app/(app)/app/[orgSlug]/CLAUDE.md` — padrão de páginas dentro do app

## Diretório de referência (modelos vivos)

Quando precisar de modelo concreto, leia:
- `lib/tasks/` — exemplo CRUD completo (queries + actions + schemas)
- `app/(app)/app/[orgSlug]/tarefas/` — página com DataTable + detail + dialog
- `supabase/migrations/_TEMPLATE_org_scoped_table.sql.example` — template SQL

## Quando estiver perdido

Pergunte ao aluno ANTES de adivinhar. O público é leigo — escolhas erradas viram débito técnico que ele não consegue diagnosticar.
