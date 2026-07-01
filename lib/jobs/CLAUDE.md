# CLAUDE.md — lib/jobs

## Responsabilidade

Orquestrador de jobs de background do template. Roda `setInterval`s no processo Node, disparados 1x no boot por `instrumentation.ts` (raiz do projeto).

Hoje rodam 5 jobs (3 recoveries + worker + recovery de automações):

| Job | Intervalo | Implementação |
|---|---|---|
| `recoverStaleMessages` | 60s | `lib/messaging/recovery.ts` (Sub-A) |
| `recoverStaleDocuments` | 30s | `lib/agent/rag/ingest.ts` (Sub-D) |
| `recoverStaleAgents` | 30s | `lib/agent/recovery.ts` (Sub-D) |
| `processNextRuns` (worker automações) | 5s | `lib/automations/worker.ts` (Sub-H) |
| `recoverStaleAutomationSteps` | 30s | `lib/automations/recovery.ts` (Sub-H) |

## Por que `instrumentation.ts` e não Vercel Cron

EasyPanel / VPS não executam `vercel.json` cron. `instrumentation.ts` é boot hook do Next.js que roda em qualquer host Node. Detalhe explicado no `lib/agent/CLAUDE.md` (seção Recovery).

## Como adicionar um job novo

1. Implementa o helper no domínio (`lib/<dominio>/recovery.ts` ou similar)
2. Importa em `lib/jobs/index.ts` e adiciona um `setInterval` dentro de `startBackgroundJobs`
3. Decida intervalo (30s pra coisas voláteis, 60s+ pra cleanup)

## Dev local

Set `DISABLE_BACKGROUND_JOBS=true` no `.env.local` pra evitar logs ruidosos durante debug.
