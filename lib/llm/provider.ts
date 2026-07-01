import type { LanguageModelV3 } from "@ai-sdk/provider";

export type LLMProviderName = "openai" | "anthropic";

/**
 * Modelo de linguagem compatível com Vercel AI SDK.
 * Use com `streamText`, `generateText`, `streamObject` etc.
 */
export type LanguageModel = LanguageModelV3;

export type LLMOptions = {
  /** Override do provider (default vem do env LLM_PROVIDER). */
  provider?: LLMProviderName;
  /** Override do modelo. */
  model?: string;
};
