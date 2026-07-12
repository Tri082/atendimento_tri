import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/llm";
import type { OnboardingChoiceOption } from "./script";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Matching determinístico — cobre tap de botão (que já manda o id/label
 * exato) e a maioria das respostas de texto livre óbvias. */
export function matchChoiceByText(
  options: OnboardingChoiceOption[],
  text: string,
): string | null {
  const normalized = normalize(text);
  const direct = options.find(
    (o) => normalize(o.id) === normalized || normalize(o.label) === normalized,
  );
  if (direct) return direct.id;

  const partial = options.find((o) => normalized.includes(normalize(o.label)));
  return partial?.id ?? null;
}

/**
 * Resolve uma resposta em texto livre pra uma das opções fixas do step.
 * Tenta matching determinístico primeiro (rápido, sem custo de LLM); só cai
 * pro LLM quando a resposta é ambígua o suficiente pra precisar de
 * interpretação (ex: "foi minha amiga que indicou" → "indicacao").
 * NUNCA lança exception — falha do LLM vira `null` (chamador re-pergunta).
 */
export async function interpretChoiceAnswer(
  options: OnboardingChoiceOption[],
  text: string,
): Promise<string | null> {
  const direct = matchChoiceByText(options, text);
  if (direct) return direct;

  const optionIds = options.map((o) => o.id) as [string, ...string[]];

  try {
    const result = await generateObject({
      model: getLanguageModel(),
      schema: z.object({
        optionId: z.enum(optionIds).nullable(),
      }),
      prompt: `O cliente respondeu: "${text}"

Qual destas opções mais se aproxima da resposta dele? Se nenhuma se aplicar com confiança, responda null.

${options.map((o) => `- ${o.id}: ${o.label}`).join("\n")}`,
    });
    return result.object.optionId;
  } catch {
    return null;
  }
}
