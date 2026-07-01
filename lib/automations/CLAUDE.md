# CLAUDE.md — lib/automations

Sistema de automações declarativas event-based (Sub-projeto H). Aluno cria automações pela UI **ou pedindo pro Claude Code**. Ambos editam o mesmo registro JSON no DB, validado pelo mesmo schema Zod.

## Pra criar uma automação via Claude Code

Use `createAutomationAction` de `lib/automations/actions.server.ts`. Forma:

```ts
import { createAutomationAction } from "@/lib/automations/actions.server";

await createAutomationAction({
  orgSlug: "minha-org",
  name: "Boas-vindas WhatsApp",
  description: "Manda saudação automática em novos contatos do WhatsApp",
  trigger_type: "conversation.created",
  trigger_config: { channel_type_in: ["whatsapp_cloud","whatsapp_evolution"] },
  conditions: [
    { field: "contact.email", op: "is_empty" }
  ],
  actions: [
    { type: "create_contact", config: { name: "Lead", phone: "{{conversation.external_thread_id}}" }, on_error: "stop" },
    { type: "send_whatsapp_message", config: { conversation_id: "{{conversation.id}}", text: "Oi! Recebemos seu contato." }, on_error: "continue" }
  ],
  status: "draft",
});
```

## Estrutura

```
lib/automations/
  registry.ts            ⭐ FONTE DA VERDADE (importa todos triggers + actions)
  schemas.ts             interfaces TriggerDefinition/ActionDefinition + Zod
  emit.ts                emitEvent + emitAfter (helper)
  engine.ts              runAutomation(runId)
  worker.ts              processNextRuns + startAutomationWorker
  recovery.ts            recoverStaleAutomationSteps
  conditions.ts          evaluateConditions
  templating.ts          interpolate({{var}})
  path.ts                resolvePath (compartilhado)
  limits.ts              constantes
  templates.ts           5 templates pré-prontos
  actions.server.ts      Server Actions (CRUD + status + dry-run + retry)
  queries.ts             reads pra UI
  triggers/              7 definições
  actions/               14 definições + _types.ts
```

## Triggers (7)

| ID | Quando | Vars principais |
|---|---|---|
| `conversation.created` | Primeira mensagem inbound numa conversa nova | `{{conversation.id}}`, `{{channel.type}}`, `{{contact.phone}}` |
| `message.received` | Toda mensagem inbound | `{{message.body}}`, `{{conversation.id}}` |
| `deal.created` | Deal criado | `{{deal.id}}`, `{{deal.stage}}`, `{{deal.name}}` |
| `deal.stage_changed` | Deal mudou de estágio | `{{deal.previous_stage}}`, `{{deal.new_stage}}` |
| `contact.created` | Contato cadastrado | `{{contact.id}}`, `{{contact.email}}` |
| `task.completed` | Tarefa marcada como done | `{{task.id}}`, `{{task.title}}` |
| `agent.escalated` | Agente IA escalou pra humano | `{{conversation.id}}`, `{{reason}}` |
| `contact.tag_added` | Tag aplicada num contato | `{{entity_id}}`, `{{tag_id}}`, `{{applied_by_kind}}` |
| `contact.tag_removed` | Tag removida de um contato | `{{entity_id}}`, `{{tag_id}}` |
| `deal.tag_added` | Tag aplicada num deal | `{{entity_id}}`, `{{tag_id}}`, `{{applied_by_kind}}` |
| `conversation.tag_added` | Tag aplicada numa conversa | `{{entity_id}}`, `{{tag_id}}`, `{{applied_by_kind}}` |

Vars sempre disponíveis: `{{now.iso}}`, `{{now.date}}`, `{{now.time}}`, `{{org.name}}`, `{{org.slug}}`, `{{steps.N.field}}`.

## Actions (14)

| Categoria | ID | Principais |
|---|---|---|
| crm | `create_contact` | name, phone?, email?, company_id? |
| crm | `update_contact` | contact_id, name?, email?, phone? |
| crm | `create_deal` | name, stage, value?, company_id (NOT NULL), contact_id? |
| crm | `update_deal_stage` | deal_id, new_stage |
| crm | `update_deal_fields` | deal_id, name?, value?, notes? |
| crm | `create_task` | title, description?, priority, due_in_days? |
| messaging | `send_whatsapp_message` | conversation_id, text |
| messaging | `send_whatsapp_template` | conversation_id, template_name, language_code, parameters |
| messaging | `send_email` | to, subject, body (React Email genérico) |
| org | `assign_owner` | target="conversation" (única target supportada), target_id, assignee ("round_robin" \| uuid) |
| org | `add_tag_to_conversation` | conversation_id, **tag_id** (era tag_name) |
| crm | `apply_tag_to_contact` | contact_id, tag_id |
| crm | `apply_tag_to_company` | company_id, tag_id |
| crm | `apply_tag_to_deal` | deal_id, tag_id |
| org | `remove_tag_from_conversation` | conversation_id, tag_id |
| crm | `remove_tag_from_contact` | contact_id, tag_id |
| crm | `remove_tag_from_company` | company_id, tag_id |
| crm | `remove_tag_from_deal` | deal_id, tag_id |
| org | `pause_agent_on_conversation` | conversation_id |
| org | `escalate_to_human` | conversation_id, reason |
| external | `call_webhook` | url (HTTPS), webhook_secret (≥16 chars), payload, headers? |

`call_webhook` assina o body com HMAC SHA256 (header `x-automation-signature`), bloqueia IPs RFC1918+loopback+link-local+IPv6.

## Conditions (AND-only)

```ts
{ field: "deal.value", op: "gt", value: 1000 }
{ field: "channel.type", op: "in", value: ["whatsapp_cloud","whatsapp_evolution"] }
{ field: "contact.email", op: "is_empty" }
```

Ops: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `in`, `not_in`, `is_empty`, `is_not_empty`, `has_tag`, `lacks_tag`.

`has_tag` / `lacks_tag`: `field` é `<entity>.has_tag` (contact/deal/company/conversation), `value` é o tag_id (uuid). Lookup async no DB usando `ctx.orgId` — fail-closed quando orgId ausente.

Múltiplas condições = AND. Sem OR — modele como 2 automações.

## Templating

`{{path.to.value}}` substitui no momento da execução. Variável inexistente vira string vazia. Encadeamento: `{{steps.0.contact_id}}`.

Decisão consciente: handlebars-style dot path. Chaves com dot literal (`{ "a.b": "x" }`) NÃO são acessíveis via `{{a.b}}` — sempre splita primeiro.

## Engine

1. Emitter chama `emitAfter("scope", {...})` (ou `emitEvent` direto se quiser fire-and-forget sem `after()`).
2. `emit.ts` insere `automation_runs(pending)` por automação match. Idempotência via `UNIQUE (automation_id, trigger_event_id)`.
3. Worker (5s setInterval em `lib/jobs/`) + kick via `after()` no emit.
4. Engine lê run + automation snapshot, avalia conditions, executa actions sequencial com timeout 30s/step, grava `automation_run_steps`.
5. Recovery (30s) marca steps `running > 90s` como `failed` + cascade pra run pai (cutoff = 3× timeout pra evitar race).

**Recursion guard via `depth ≤ 5`** no payload `_meta`. Importante: domain actions de automação (CRM) usam `createServiceClient` direto contra as tabelas (`contacts`, `deals`, `tasks`) — **NÃO chamam Server Actions de domínio** (`lib/contacts/actions.ts`, etc.) que contêm `emitAfter`. Logo a escrita feita por automação não dispara outro evento naturalmente. Loop entre automações só seria possível via futuro action que invoque Server Action de domínio (não recomendado).

**Re-entrancy guard nos jobs** (`lib/jobs/index.ts`): worker e recovery têm flag em memória que skipa tick novo se a execução anterior ainda está rodando. Singleton de boot evita registrar intervals 2x em hot-reload (dev) ou multi-import.

## Pra adicionar trigger novo

1. Criar `triggers/seu-trigger.ts` exportando `TriggerDefinition` (id, label, contextSchema, triggerConfigSchema, variables, sampleContext)
2. Registrar em `registry.ts` (`TRIGGERS["seu.trigger"] = ...`)
3. Adicionar entrada em `variable-labels.ts` (importa o trigger diretamente, NÃO via registry — `registry.ts` puxa actions server-only que quebram bundle de client component que consome o helper).
4. Adicionar branch em `triggerConfigMatches` de `emit.ts` se tiver filtros
5. Emitir `emitAfter({...})` no ponto do codebase onde o evento acontece
6. Documentar variáveis aqui

## Pra adicionar action nova

1. Criar `actions/sua-action.ts` exportando `ActionDefinition` (id, label, category, inputSchema, execute, simulate)
2. Registrar em `registry.ts` (`ACTIONS["sua_action"] = ...`)
3. `execute` recebe `(input, ctx: { orgId, depth, runId })` — usa `createServiceClient` + `organization_id: ctx.orgId` em mutations
4. `simulate` retorna output realista **sem efeito colateral**
5. Documentar aqui

## Limites operacionais

`lib/automations/limits.ts`:
- 20 actions/automação, 10 conditions/automação
- 100 runs pending/org (queue overflow → `skipped_queue_full`)
- Depth máx 5 (recursion guard)
- Timeout por step: 30s
- Hard cutoff via recovery: 90s (3× timeout pra evitar race com engine)
- Payload máx 64 KB (também aplicado em dry-run)
- Worker pega 10 runs/ciclo

## Permissões

- **Criar/editar/excluir/dry-run/retry:** owner/admin (escopo do CRUD).
- **Ver histórico:** owner/admin (`/runs` e `/runs/[id]` chamam `requireOrgRole`).

## Caveats / TODOs

- **At-most-once** entre commit DB e `after()`. Se servidor cair entre os dois, evento perde. Transactional outbox seria evolução natural.
- **DNS rebinding** em `call_webhook` não coberto (hostnames passam sem resolve no momento da chamada). Aceitável MVP. Sub-H C-4 já bloqueia formas alternativas de IPv4 (decimal puro `2130706433`, hex `0x...`, octal `0177.x`, `0.0.0.0`, IPv6 `[::1]`). Round-2 #14 adiciona CGN 100.64/10, multicast 224/4 e reserved/broadcast 240+255.
- **`agent.escalated` channel resolvido na escalação via tool** (Round-2 #18): query no `conversations → channels` injeta `{channel.id, channel.type}` reais quando o tool roda. Em escalações via outros caminhos (humano clica "assumir"), depende do emitter passar o channel.
- **`assign_owner` só pra `conversation`** — contacts/deals não têm coluna `owner_id` (created_by é imutável via trigger).
- **`{{now.iso}}` é injetado pelo engine** — não vem do contextSchema. Documente em CLAUDE.md de cada trigger.
- **Re-entrancy guards são por-processo:** os flags `automationWorkerRunning` / `automationRecoveryRunning` em `lib/jobs/index.ts` são variáveis de módulo Node — protegem ticks empilhados DENTRO de um único processo. Em deploy multi-replica (Vercel serverless cold/warm starts, EasyPanel scale-out), cada réplica tem flag próprio. O lock condicional no worker (`UPDATE ... WHERE status='pending'`) cobre dedup real, então não há double-execution, mas pode haver queries "perdidas" (skip de rows lockadas por outra réplica). Aceitável MVP. Pra eliminar 100%, adicione advisory lock via `pg_advisory_xact_lock` no worker.

## Risk register (Sub-H pós deep reviews)

Round-1 (23 findings) + Round-2 (17 findings) aplicados:

| Sev | ID | Fix |
|---|---|---|
| C-1 | assign_owner UUID literal | `assertOrgMember` no execute (defesa em profundidade do round_robin) |
| C-2 | org isolation em 9 actions | Helper `assertOrgOwns(table, id, orgId)` em `_org-isolation.ts` no início de cada execute |
| C-3 | `task.completed` / `deal.stage_changed` re-conclusão | `eventId` discrimina por timestamp (`${id}:${ts}` / `${id}:${stage}:${ts}`) |
| C-4 | SSRF parsing alt | `isSafeWebhookUrl` rejeita IPv4 decimal/hex/octal, 0.0.0.0, IPv6 |
| C-5 | `interpolate` objeto/array | Retorna `""` em vez de `"[object Object]"`. `{{ }}` vazio também `""` |
| H-2 | Worker re-entrancy | Guard `automationWorkerRunning` skipa ticks empilhados |
| H-3 | Singleton jobs | `jobsStarted` flag + `process.listenerCount("SIGTERM")` guard |
| H-4 | `agent.escalated` dedupe | `eventId` inclui `randomUUID().slice(0,8)` além de timestamp |
| H-5 | Retry de dry-run | `retryRunAction` bloqueia se `_meta.dry_run=true` ou `trigger_event_id` começa com `dry-run-` |
| H-6 | CRLF em headers | `call_webhook` sanitiza headers (reject CR/LF em key, replace em value) |
| H-7 | Race recovery × engine | Cutoff 60→90s + `.eq("status","running")` no UPDATE de steps |
| H-8 | Runs page member | `/runs` e `/runs/[id]` viraram admin-only |
| M-1 | Dry-run payload size | Mesmo limite do emit (64 KB) |
| M-2 | `enrichPayloadForRun` | Centraliza `_meta` enrichment em emit.ts |
| M-3 | `update_contact` string vazia | Skip `if name === ""` (evita sobrescrever bom valor) |
| M-4 | conditions in/not_in JSON parcial | Troca Input por Textarea "um valor por linha" |
| M-5 | path trim keys | `resolvePath` aplica `trim()` em cada chave |
| M-6 | Ativar com placeholder | `setAutomationStatusAction` bloqueia se actions contém `PREENCHA_` ou `TROQUE_ESTE_SECRETO` |
| L-1 | engine console.log | Removido (status já no DB) |
| L-2 | router contact lookup | Normaliza phone + `.eq("phone", normalized)` em vez de `.maybeSingle()` random |
| L-3 | use-client desnecessário | Removido em automation-card, template-card, empty-state |
| L-4 | dnd-kit IDs | `action-${idx}` puro (estável vs trocar tipo) |
| H-1 | depth recursion | **Não é bug:** domain actions usam service client direto, sem chamar Server Actions de domínio com emitter. Documentado em Engine acima. |
| R2-1 | `getAutomationMetrics` sem ORDER BY | `.order("created_at", { ascending: false })` — `lastRun` agora é de fato o último. |
| R2-3 | engine não validava `trigger_payload` contra contextSchema | `safeParse` warning-only (não falha) em `engine.ts` antes de mountContext. |
| R2-4 | `update_contact` sem `company_id` | Schema aceita `company_id?: uuid.nullable()`. Valida org isolation. |
| R2-5 | `getAutomationMetrics` era dead code | Integrado em `page.tsx` da lista. Card mostra "N runs nos últimos 7d · M% sucesso". |
| R2-6 | Placeholder check superficial | Regex case-insensitive com 5 padrões (PREENCHA*, TROQUE*, SEU_HOOK_AQUI, SUBSTITUA*, PREENCH*). |
| R2-7 | `after()` aninhado em emit | `emitEvent` ganha flag `kickWorker`; `emitAfter` dispara processNextRuns inline (sem nested after). |
| R2-8 | Sanitize header só CR/LF | Regex cobre `\x00-\x08`, `\x0a-\x1f`, `\x7f` (RFC 7230). Reject em vez de replace. |
| R2-9 | skip-empty só em `name` | Aplicado a email/phone (contact) e name/notes (deal). |
| R2-10 | `path "a..b"` truncava | Detecta key vazia no meio → retorna `undefined`. |
| R2-11 | dnd-kit IDs idx-based instáveis | UIDs via `crypto.randomUUID()` em ref paralela. Reordena UIDs + value em paralelo. |
| R2-12 | Multi-replica não documentado | Caveat acima explicando per-process re-entrancy guard + advisory lock como evolução. |
| R2-13 | `task.completed` / `deal.stage_changed` timestamp em ms | Coalesce por minuto (ISO slice(0,16)) — toggle rápido idempotente. |
| R2-14 | SSRF: CGN/multicast/broadcast | Bloqueia 100.64/10, 224/4, 240/4, 255.255.255.255. |
| R2-15 | Hostname vazio em URL | `if host === "" || host === "localhost"` rejeita. |
| R2-16 | `retryRunAction` via `Date.now()` | Counter via `LIKE ${eventId}:retry-%`. Duplo-click → 23505 → mensagem leiga. |
| R2-17 | `interpolate` objeto/array → "" silencioso | JSON.stringify truncado em 500 chars + "..." sufixo. |
| R2-18 | `escalate.ts` channel hardcoded `""` | Busca `conversations.channel(id, type)` antes do emit. |

## Smoke test manual (pós Fase A+B leigo-friendly)

1. Crie automação pelo template **Lead WhatsApp → cria deal**:
   - Se org tem 1 empresa: `company_id` auto-preenche; banner amarelo não aparece.
   - Se org tem 0 ou >1 empresas: banner amarelo aparece listando "ID da empresa em Ação 2 (Criar deal)".
2. Crie automação pelo template **Integração Zapier — deal ganho**:
   - `webhook_secret` auto-preenche (32 bytes hex aleatórios).
   - Banner amarelo lista APENAS "URL do webhook em Ação 1".
3. Clique em cada ação → o dialog abre com **form de verdade** (label PT-BR + campo separado por field). Pras 21 actions com metadata em `action-fields.ts`, NÃO deve aparecer JSON cru.
4. Cada campo que aceita variável tem botão "Variável" do lado → abre popover com labels amigáveis ("Nome do contato — ex: João Silva"), clicando insere `{{...}}` no valor.
5. Clique "Testar" → dry-run executa cada step com sample data; status `completed` indica chain inteira ok.
6. Preencha campos pendentes (banner some quando todos resolvidos).
7. Ative.
8. Histórico em `/automacoes/<id>/runs` mostra run completed quando trigger real disparar.

### Smoke test pra cada um dos 5 templates

| Template | Setup esperado | Resultado esperado |
|---|---|---|
| Lead WhatsApp → cria deal | Org com 1 empresa | company_id auto-fill, banner não aparece, ativa direto |
| Lead WhatsApp → cria deal | Org sem empresa | Banner pede "ID da empresa", ativar bloqueado até preencher |
| Boas-vindas a novo contato | — | Banner não aparece, ativa direto, dry-run completed |
| Follow-up de proposta | — | Idem |
| Handoff urgente | — | Idem |
| Integração Zapier — deal ganho | URL real do Zapier | webhook_secret auto-fill, banner pede só URL, preenche → ativa |
