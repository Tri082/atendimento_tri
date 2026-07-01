import { anthropicModel } from "./adapters/anthropic";
import { openaiModel } from "./adapters/openai";
import type { LanguageModel, LLMOptions, LLMProviderName } from "./provider";

/**
 * Retorna o modelo de linguagem configurado.
 *
 * Seleção do provider:
 * 1. `opts.provider` (override explícito)
 * 2. `process.env.LLM_PROVIDER` ("openai" | "anthropic")
 * 3. R3-LLM-003: detecção automática baseada na chave disponível
 * 4. Fallback: "anthropic"
 */
function detectProvider(): LLMProviderName {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "anthropic";
}

export function getLanguageModel(opts: LLMOptions = {}): LanguageModel {
  const provider: LLMProviderName =
    opts.provider ?? (process.env.LLM_PROVIDER as LLMProviderName) ?? detectProvider();

  switch (provider) {
    case "openai":
      return openaiModel(opts.model);
    case "anthropic":
      return anthropicModel(opts.model);
    default:
      throw new Error(`Provider LLM desconhecido: ${provider}`);
  }
}

export type { LanguageModel, LLMOptions, LLMProviderName } from "./provider";
