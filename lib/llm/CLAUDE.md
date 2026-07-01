# CLAUDE.md — lib/llm

## Responsabilidade

Wrapper sobre Vercel AI SDK pra abstrair providers de LLM (Anthropic, OpenAI).
Usado por: `lib/agent/run.ts` (agente IA, Sub-D).

## Como usar

```typescript
import { getLanguageModel } from "@/lib/llm";
import { generateText } from "ai";

const result = await generateText({
  model: getLanguageModel(),  // default: detecta via env
  messages: [...],
});

// Override explícito:
getLanguageModel({ provider: "openai", model: "gpt-4o" });
```

## Seleção de provider

1. `opts.provider` (override explícito)
2. `process.env.LLM_PROVIDER` ("openai" | "anthropic")
3. Auto-detect: se tem `ANTHROPIC_API_KEY`, usa anthropic; senão `OPENAI_API_KEY`
4. Fallback: anthropic

## Env vars

- `ANTHROPIC_API_KEY` — pra Claude
- `OPENAI_API_KEY` — pra GPT **E pra embeddings do RAG (Sub-D)**, mesmo se LLM principal for outro

## Adapters

- `adapters/anthropic.ts` — `claude-haiku-4-5-20251001` default
- `adapters/openai.ts` — `gpt-4o-mini` default

## Adicionar novo adapter

1. Criar `adapters/<nome>.ts` exportando função `<nome>Model(modelId?)` que retorna `LanguageModel`
2. Adicionar case no switch em `index.ts`
3. Adicionar valor em `LLMProviderName` em `provider.ts`
