import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "../provider";

/**
 * Cria modelo Anthropic Claude usando a chave do env.
 *
 * Padrão: `claude-haiku-4-5-20251001` (rápido e barato).
 * Modelos: claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5-20251001.
 * Ver https://docs.claude.com/en/docs/about-claude/models
 */
export function anthropicModel(modelId = "claude-haiku-4-5-20251001"): LanguageModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não está setada no .env.local. Cadastre em https://console.anthropic.com.",
    );
  }
  const provider = createAnthropic({ apiKey });
  return provider(modelId);
}
