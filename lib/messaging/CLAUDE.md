# CLAUDE.md — lib/messaging

## Responsabilidade

Camada de mensageria multi-canal (WhatsApp, Telegram, Instagram DM, SMS).
Sustenta a inbox, o agente de IA e qualquer fluxo de conversa.

## Arquitetura em 3 camadas

```
UI (inbox)  ───▶  Router (business logic)  ───▶  Adapter (protocolo)
                  │                              │
                  └─ processSendOutbound          └─ adapters/mock.ts
                  └─ processInboundMessage       └─ adapters/whatsapp-cloud.ts
                  └─ processStatusUpdate         └─ adapters/telegram.ts
                                                 └─ ...
```

**Regra:** adapter NÃO conhece tabelas do CRM. É puro tradutor de protocolo.
Quem grava em DB é o router.

## Tabelas

- `channels` — canal conectado a uma org. Tokens vivem em `config` JSONB.
- `conversations` — uma conversa por (channel, contato externo).
- `messages` — mensagens individuais. Idempotência via UNIQUE (conversation_id, external_id).

## Como adicionar um canal novo

1. Criar `adapters/<nome>.ts` implementando `MessagingAdapter`.
2. Adicionar `import "./adapters/<nome>"` em `lib/messaging/index.ts`.
3. Atualizar enum `ChannelType` em `adapter.ts`.
4. Atualizar CHECK do `type` na migration `20260602000001_messaging_channels.sql` (criar nova migration de ALTER).
5. Sem mudanças no router. Pronto.

## Server Actions

- `sendMessageAction(input)` — envia mensagem livre. Aplica check de 24h em WhatsApp.
- `sendTemplateAction(input)` — envia template aprovado. Bypassa 24h.

Ambas gravam status='sending' → retornam → `after()` chama `processSendOutbound` que fala com adapter.

## Webhook

URL única: `POST /api/webhooks/messaging/[provider]`.

Fluxo:
1. Verifica HMAC via `adapter.verifyWebhook`
2. Ack 200 imediato
3. `after()` chama `processWebhook` → dispatch pro router

## Realtime

A inbox recebe atualização ao vivo via **broadcast triggered** (não usa `postgres_changes`).

### Como funciona

1. Trigger SQL `public.messaging_broadcast()` (migration `20260604043000_inbox_realtime_broadcast_refactor.sql`) escuta INSERT/UPDATE/DELETE em `conversations`, `messages`, `conversation_tag_links`.
2. Pra cada mutação chama `realtime.send(payload, 'change', 'inbox:{org_id}', private=true)` com payload `{ table, op, id }`.
3. Cliente (`app/(app)/app/[orgSlug]/inbox/inbox-shell.tsx`) assina o channel privado `inbox:{org_id}`. Autorização via policy `realtime: org members subscribe inbox topic` em `realtime.messages` (inline subquery em `memberships`, sem helper).
4. Channel privado exige JWT no cliente Realtime — o `InboxShell` chama `supabase.realtime.setAuth(session.access_token)` ANTES do subscribe. Sem isso o broker rejeita com `CHANNEL_ERROR: Unauthorized`.
5. Ao receber qualquer payload, o cliente chama `router.refresh()` debounced em 500ms — a página re-renderiza com data fresca do server.

### Por que não `postgres_changes`?

`postgres_changes` força o broker do Realtime a rodar `realtime.apply_rls` em prepared statements long-lived (`walrus_rls_stmt`). Esse statement cacheia o resultado do permission check em `is_org_member`. Se o grant pro `supabase_realtime_admin` não existe no momento do primeiro subscribe (cenário normal de aluno novo que ainda não aplicou a migration de grant), o broker fica preso em `permission denied` mesmo aplicando grant depois — só destrava com restart do projeto Supabase. Broadcast triggered evita esse caminho.

### Como debugar

Abrir a inbox com `?debug=1` na URL. `InboxShell` loga no console:
- `subscribing private broadcast inbox:{org_id}` ou `no session, skipping realtime subscribe`
- `subscribe status SUBSCRIBED` (sucesso) | `CHANNEL_ERROR` (auth) | `TIMED_OUT` (rede)
- Cada payload recebido `{ table, op, id }`.

Pra inspecionar broadcasts no banco:
```sql
select inserted_at, topic, event, payload
  from realtime.messages
 where topic = 'inbox:{org_id}'
 order by inserted_at desc limit 10;
```

### Subscribers que NÃO usam postgres_changes

`app/(app)/app/[orgSlug]/inbox/agent-status-indicator.tsx` é pura derivação da prop `status`. O `InboxShell` chama `router.refresh()` quando broadcast chega (inclui UPDATE em `conversations` quando `agent_status` muda), a página re-fetcha e a prop atualizada propaga. Sem subscribe próprio.

## Recovery

Cron `/api/cron/recover-messages` roda 1x/min (config em `vercel.json`). Marca como `failed` qualquer mensagem em `sending` há mais de 60s (provável morte do `after()`).

Auth via header `Authorization: Bearer ${CRON_SECRET}`. Configure `CRON_SECRET` no env do Vercel.

## Smoke test manual

Pré: ter ao menos uma org criada via UI normal.

1. Inserir um channel mock direto via SQL (Supabase Studio):
```sql
insert into channels (organization_id, type, name, status, config)
values ('<sua-org-id>', 'mock', 'Mock Local', 'connected', '{}');
```

2. Simular webhook inbound via curl:
```bash
curl -X POST http://localhost:3000/api/webhooks/messaging/mock \
  -H "content-type: application/json" \
  -d '{
    "events": [
      {
        "kind": "message",
        "externalThreadId": "+5511987654321",
        "externalMessageId": "smoke-1",
        "body": "Mensagem de teste",
        "channelId": "<channel-id-criado-acima>"
      }
    ]
  }'
```

3. Abrir `/app/{slug}/inbox` — deve listar 1 canal.
4. Direto no Supabase Studio: ver linha em `conversations` + linha em `messages`.

## Regras absolutas

- Tokens em `channels.config` nunca vão pro browser. Use `getChannelConfig()` no server.
- `verifyWebhook` é obrigatório. Sem ele, qualquer um manda POST e injeta mensagem.
- `enable row level security`, nunca `force` (regra global do CLAUDE.md raiz).
- Erros do adapter passam por `translateError()` antes de virem pra UI.

## Sub-projetos seguintes

- **B.** Adapter `whatsapp-cloud` real (Meta Cloud API): tokens, Embedded Signup, templates.
- **C.** Inbox UI rica: lista de conversas, thread, anexos, atribuição, busca.
- **D.** Agente de IA: tool use no CRM, handoff humano, prompts por org.

---

## WhatsApp Cloud (Sub-projeto B)

Adapter implementado em `lib/messaging/adapters/whatsapp-cloud/`. Estrutura modular:
- `schema.ts` — Zod do `channels.config`
- `client.ts` — `graphFetch` + `graphFetchBinary` (wrappers HTTP)
- `error-map.ts` — `mapMetaError` (tabela de códigos Meta → PT-BR)
- `parse-webhook.ts` — `parseWebhook` (Meta JSON → NormalizedEvent[])
- `extract-message.ts` — `extractMessageContent` + `toRemoteTemplate`
- `adapter.ts` — implementação `MessagingAdapter`
- `index.ts` — registra no boot
- `actions.ts` — 4 Server Actions (connect/verify/disconnect/test-send)
- `action-schemas.ts` — Zod inputs

Templates em `lib/messaging/templates/`:
- `sync.ts` — `applyTemplateSync` (upsert + cleanup)
- `actions.ts` — `syncTemplatesAction`
- `queries.ts` — `getApprovedTemplatesByChannel`
- `schemas.ts` — Zod

Tabela `whatsapp_templates` (migration `20260603000001`).

### Como conectar um número (UI)

`/app/{orgSlug}/settings/channels` → dropdown "Conectar WhatsApp ▾" → "Oficial (Meta Cloud API)".

Abre o modal `ConnectCloudDialog` (em `_components/`) com 4 passos:
pré-requisitos → credenciais → webhook na Meta → verificar conexão.

### Smoke test WhatsApp (precisa credenciais Meta reais)

1. Logue como owner/admin de uma org
2. Vá em `/settings/channels` → "Conectar WhatsApp"
3. Step 1: confirme que tem conta Meta + número + app
4. Step 2: cole `phoneNumberId`, `wabaId`, `accessToken` (System User Token), `appSecret`
5. Step 3: copie a URL + verifyToken e configure no Meta dashboard (developers.facebook.com → seu app → WhatsApp → Configuration). Inscreva-se em `messages`.
6. Step 4: clique "Verificar conexão" → templates aparecem
7. Na página de detalhes do canal, use o form "Enviar template de teste" pra disparar pro seu próprio número
8. Responda no WhatsApp → mensagem chega na inbox

### Refatorações na foundation feitas pelo Sub-projeto B

- Interface `MessagingAdapter` ganhou `listTemplates?` e `verifyWebhook(req, channelConfig?)`
- Router `processInboundMessage` faz lookup de canal por `external_id = phoneNumberId` (fallback ao `raw.channelId` do mock)
- Router baixa mídia inbound via `adapter.fetchMedia` e uploada no bucket `messaging` quando `externalMediaId` presente
- Router `processSendOutbound` dispatcha pra `adapter.sendTemplate` quando `provider_metadata.template` existe (corrige bug latente)
- Webhook GET handshake valida `verifyToken` por canal (lookup em `config->>verifyToken`)
- Webhook POST passa `channelConfig` (com `appSecret`) pro `adapter.verifyWebhook`

---

## Inbox UI (Sub-projeto C)

UI rica 3-pane responsiva em `app/(app)/app/[orgSlug]/inbox/`.

### Layout

- `≥1024px`: 3 panes (lista + thread + contexto)
- `768-1023px`: 2 panes (lista + thread), contexto via sheet
- `<768px`: 1 pane por vez, rota `/inbox/[id]` em full-screen

A inbox usa `-mx-6 -mb-24 -mt-6 min-h-0 flex-1` pra escapar do `p-6 pb-24` do layout pai e ocupar a viewport inteira (mesmo padrão do deals/kanban).

### Rotas

- `/inbox` — lista + estado vazio à direita
- `/inbox/[conversationId]` — lista + thread + contexto. URL é fonte da verdade dos filtros via searchParams (`?status=open&channel=...&tags=...&assignee=...&q=...`).

### Realtime

`InboxShell` (Client wrapper) subscribe a `conversations`, `messages`, `conversation_tag_links` filtrados por `org_id`. Eventos → `router.refresh()` debounced 500ms.

### Tags

- Catálogo: `conversation_tags` (id, name, color)
- Junction: `conversation_tag_links` (conversation_id, tag_id, organization_id)
- Gerenciamento: inline na inbox (`tag-picker.tsx` reusa `TagFormDialog` de `/settings/tags/`) + página dedicada `/settings/tags` (admin only)

### Server Actions novas

- `lib/messaging/conversations/actions.ts`: `assignConversationAction`, `resolveConversationAction`, `markConversationReadAction`, `retryMessageAction`, `uploadConversationMediaAction`, `promoteConversationToContactAction`
- `lib/messaging/tags/actions.ts`: `createTagAction`, `updateTagAction`, `deleteTagAction`, `addTagToConversationAction`, `removeTagFromConversationAction`

### Format helpers (puros, com testes)

`lib/messaging/format/`:
- `time.ts` — `formatMessageTime` (hoje/ontem/dia da semana/dd-mm), `formatDay` (cabeçalho de grupo), `formatRelative`
- `group.ts` — `groupMessagesByDay`, `groupMessagesBySender`

### Mídia outbound

Composer chama `uploadConversationMediaAction` → upload pro bucket `messaging` em `{org_id}/{conv_id}/_outbound/{uuid}.{ext}` → retorna `{ path, signedUrl }`. signedUrl passa pro `sendMessageAction`. `message-media.tsx` detecta se `media_url` é path Storage e gera fresh signed URL on-demand (1h).

### Smoke test Sub-C

1. `/settings/channels`: conectar canal mock (Sub-A) ou WhatsApp real (Sub-B)
2. Inserir mensagem via webhook mock OU enviar via WhatsApp real
3. `/inbox`: ver conversa na lista, abrir → ver thread + composer + contexto
4. Composer: enviar texto → aparece via Realtime
5. Composer: anexar imagem/PDF → upload → enviar → aparece via Realtime
6. Composer: clicar template → modal → enviar com params
7. Painel direito: criar tag, adicionar, remover; promover não-id pra contato
8. Header: marcar resolvida → toggle status
9. `/settings/tags`: criar, editar (rename + recolor), deletar tag com conversas usando

---

## WhatsApp Evolution (Sub-projeto G)

Provider não-oficial via Evolution API (Baileys / WhatsApp Web). Coexiste com Cloud API.

### Estrutura

Pasta `lib/messaging/adapters/whatsapp-evolution/` (espelha `whatsapp-cloud/`):
- `schema.ts` — Zod EvolutionConfig
- `client.ts` — `postJson`/`getJson` fetch wrappers
- `error-map.ts` — códigos HTTP → mensagens PT-BR
- `parse-webhook.ts` — payload Evolution → `NormalizedEvent[]`
- `verify-webhook.ts` — `verifyBearer` timing-safe
- `extract-message.ts` — `stripPlus`, `jidToPhone`, `mimeToMediaType`, `extractFilename`, `isoFromUnixSeconds`
- `connection-update.ts` — `handleConnectionUpdate` atualiza `channels.status`
- `adapter.ts` — `evolutionAdapter: MessagingAdapter`
- `index.ts` — registra no boot
- `actions.ts` — `connect/reverify/disconnect/testSend` Server Actions
- `action-schemas.ts` — Zod inputs

### Diferenças vs Cloud

- **Sem templates** — `capabilities.templates: false`; `sendTemplate` retorna `{ unsupported: true }`
- **Sem janela 24h** — Evolution não força essa lógica
- **Auth bearer** no webhook (Evolution não assina body como Meta HMAC)
- **1 mídia por request** — múltiplas mídias viram N requests sequenciais

### Como conectar (resumo do wizard)

1. Aluno entra em `/settings/channels` → dropdown "Conectar WhatsApp ▾" → "Não-oficial (Evolution API)"
2. Abre o modal `ConnectEvolutionDialog` (em `_components/`).
3. Step 1: lê aviso de risco e marca checkbox
4. Step 2: cola URL + API key + instance name + nome interno
5. Action valida `connectionState=open`, gera `webhookSecret`, configura webhook no Evolution via API, salva canal
6. Step 3: confirma e oferece atalhos (agente, inbox, detalhe)

### Webhook

- POST `/api/webhooks/messaging/whatsapp_evolution`
- Lookup do channel: `external_id = instance` (extraído do payload)
- Auth: `Authorization: Bearer {webhookSecret}` validado em `verifyWebhook`
- `connection.update` tratado inline no route handler (não passa por `parseWebhook`) — atualiza `channels.status`
- `messages.upsert` com `fromMe: true` → ignorado (evita loop bot)

### Cuidados (regras absolutas)

- `webhookSecret` **gerado pelo template**, nunca pelo aluno
- `connectionState !== "open"` no connect → rejeita com mensagem clara
- Step 1 de aviso de risco **não persiste aceite** — reconexão relê
- `apiKey` em `channels.config` **nunca vai pro browser** (mesmo padrão Cloud)
- Disconnect **NÃO** apaga instância no Evolution — só remove row de `channels`

### Smoke test Sub-G

Pré:
- Evolution rodando em servidor público (URL HTTPS)
- API key global do Evolution
- Instância criada e conectada via QR (estado "open")

Passos:
1. `/settings/channels` → dropdown "Conectar WhatsApp ▾" → "Não-oficial (Evolution API)"
2. Step 1: marcar checkbox "Entendi os riscos", "Continuar"
3. Step 2: colar URL/key/instance/nome interno, "Verificar e conectar"
4. Step 3: confirmar canal criado, número exibido
5. No dashboard do Evolution: confirmar que webhook está configurado
6. Mandar mensagem do WhatsApp pessoal pro número conectado
7. `/inbox` deve mostrar a conversa
8. Responder pela inbox → chega no WhatsApp
9. Anexar PDF → chega no WhatsApp
10. Conectar agente ao canal em `/settings/agents/[id]?tab=config` → pergunta → resposta automática
11. Desconectar canal via UI → confirmar row removida, instância no Evolution intacta
