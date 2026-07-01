# CLAUDE.md — lib/agent

## Responsabilidade

Agente IA que responde automaticamente mensagens inbound nos canais habilitados.
Suporta tool use no CRM (read + criar contato + criar tarefa), RAG sobre FAQ + PDFs,
e 3 mecanismos de handoff humano. (Sub-projeto D.)

## Arquitetura em 3 camadas

```
Inbound webhook → router messaging (Sub-A)
                  │
                  ▼ (se channel.agent_id IS NOT NULL e agent.is_active)
                triggerAgent (lock + debounce + semáforo)
                  │
                  ▼
                runAgent (carrega ctx + RAG + generateText com tools + insere outbound)
                Recebe `agentId` do `channels.agent_id`; carrega config de `agents`,
                KB de `agent_faq_items`/`agent_documents` filtradas por `agent_id`,
                cota de `agents.daily_token_cap`
                  │
                  ▼
                processSendOutbound (Sub-A) → adapter → cliente
```

## Quando o agente NÃO responde

1. Canal com `agent_id = NULL` → router nem dispara
2. Canal aponta pra agente com `is_active=false` → router nem dispara
3. Conversa com `agent_status='paused_handoff'` → trigger desiste no lock
4. Outro trigger já está rodando (lock conditional)
5. Cota diária do agente atingida → cria task pro humano e sai

## Tools disponíveis (`lib/agent/tools/`)

| Tool | Pode | Idempotência |
|---|---|---|
| `search_knowledge_base` | Buscar FAQ + chunks de docs | — |
| `find_contact` | Buscar contato por nome/email | — |
| `list_open_deals` | Listar deals abertos do contato | — |
| `list_pending_tasks` | Listar tasks pendentes do contato | — |
| `create_contact` | Criar contato | Por `phone` (retorna existente se já houver) |
| `create_task_for_human` | Criar task pro time | Não — cria sempre |
| `escalate_to_human` | Pausar agente + criar task urgente | Não |
| `apply_tag_to_conversation` | Rotular conversa com tag. Se tag existe no catálogo com escopo de conversa → aplica direto com `applied_by_kind='bot'`. Se não existe ou não tem escopo → vira sugestão pro admin (via RPC `tag_suggestion_upsert`). | Por `(conv,tag)` PK composto |

## RAG (`lib/agent/rag/`)

- **Embedding:** OpenAI `text-embedding-3-small` (1536 dims). Requer `OPENAI_API_KEY`.
- **Storage:** pgvector com HNSW index.
- **Chunk:** pipeline em 4 estágios (Sub-F):
  - A) `normalize.ts` — preserva quebras de parágrafo (`\n\n`)
  - B) `blocks.ts` — detecta heading/paragraph/list-item
  - C) `sentences.ts` — quebra em frases pt-BR + en com abreviações/decimais/URLs preservados
  - D) `semantic-assemble.ts` — embed das frases, breakpoints por percentile (P25), envelope [400, 1200] chars
  - Fallback gracioso pra `boundaryOnlyAssemble` quando OpenAI falha
- **Reprocessar:** botão "Reprocessar" em cada PDF da tab Knowledge — `reprocessDocumentAction` apaga chunks e re-agenda `processDocument`. Cooldown de 60s.
- **Retrieve:** top-5 com similaridade ≥ 0.5. UNION de FAQ + chunks.

## Cost cap

Cada agente tem `agents.daily_token_cap`. RPC `consume_agent_tokens(_agent_id, _tokens)`
incrementa em `agent_usage_daily` e retorna `false` se passou. Ajuste retroativo via
`adjust_agent_tokens` depois de saber tokens reais.

## Handoff humano (3 mecanismos)

1. **Cliente pede** — confiamos no LLM (system prompt instrui escalate)
2. **Agente reconhece limite** — chama tool `escalate_to_human`
3. **Humano clica "Assumir"** — `pauseAgentForConversationAction` seta `paused_handoff`

## Concorrência

- **Lock por conversa:** UPDATE conditional em `conversations.agent_status` ('idle' → 'thinking'). 0 rows = outro trigger venceu, desiste.
- **Debounce 2s:** após adquirir lock, aguarda 2s. Nova inbound nesse meio tempo será coberta por novo trigger depois.
- **Semáforo global:** variável em memória, max 10 agentes concorrentes no processo. Quando passar pra multi-replica, vira lock distribuído.

## Recovery

- `recoverStaleAgents` (`lib/agent/recovery.ts`): conversas em `thinking > 5min` voltam pra `idle` + cria task pro humano.
- `recoverStaleDocuments` (`lib/agent/rag/ingest.ts`): docs em `processing > 5min` marcados `failed`.
- Orquestrado via `lib/jobs/index.ts` rodado por `instrumentation.ts` no boot.

## Smoke test Sub-E

Pré:
- Org com canal mock conectado (ou WhatsApp real)
- `OPENAI_API_KEY` no env
- Anthropic ou OpenAI key (depende do `llm_provider` configurado)

Passos:
1. `/settings/agents`: ver "Agente Principal" pré-criado
2. "+ Novo agente": criar "Agente Suporte" (tone=amigavel, cap=50k)
3. Em `/settings/agents/[id]?tab=knowledge` (Suporte): adicionar 2 FAQs
3.5. (Opcional, qualidade RAG) Em `/settings/agents/[id]?tab=knowledge` upload de um PDF. Confirma que `chunk_count` é razoável (não 1 nem 50 pra PDF de 3 páginas). Logs do servidor mostram `[agent.ingest] doc=... chunks=N sentences=M breakpoints=K`.
4. Em `/settings/agents/[id]?tab=knowledge` (Principal): adicionar 2 FAQs DIFERENTES
5. Em `/settings/channels/[id]`: dropdown → selecionar "Agente Suporte"
6. Webhook mock simula msg que casa com FAQ do Suporte → resposta vem do Suporte; ver `?tab=runs`
7. Outro canal amarrado no Principal: msg → resposta vem dele (tone diferente, FAQs diferentes)
8. Pausar Suporte → webhook nesse canal → nenhuma resposta; conversa fica esperando humano
9. Apagar Suporte com confirmação por nome → canal volta pra "Nenhum agente"

## Regras absolutas

- Tools NUNCA recebem `orgId` no input do schema — vem do closure
- Tools NUNCA jogam exception pro LLM — captura, retorna `{ error }`
- Service role key SÓ em jobs server-side (`createServiceClient`)
- Validação Zod em todos os boundaries (Server Actions + tools)
- `OPENAI_API_KEY` é obrigatória mesmo se LLM principal for Anthropic (embeddings)

## Próximo (Sub-F+)

- Streaming da resposta (vez de inserir tudo de uma vez)
- Reranking pós-retrieval (Cohere/Voyage)
- URL/site scraping na KB
- Per-canal agent settings
- Heading extraction via outline real do PDF (trocar pdf-parse por pdfjs-dist)
- Hierarchical / parent-child chunks
