import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "../provider";

/**
 * Cria modelo OpenAI usando a chave do env.
 *
 * Padrão: `gpt-4o-mini` (rápido e barato).
 * Modelos: gpt-4o, gpt-4o-mini, gpt-4-turbo, etc. — ver https://platform.openai.com/docs/models
 */
export function openaiModel(modelId = "gpt-4o-mini"): LanguageModel {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não está setada no .env.local. Cadastre em https://platform.openai.com/api-keys.",
    );
  }
  const provider = createOpenAI({ apiKey });
  return provider(modelId);
}
