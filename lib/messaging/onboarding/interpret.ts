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
  const trimmed = text.trim();

  // Steps com mais de MAX_BUTTON_OPTIONS opções (ver script.ts) viram texto
  // numerado ("1) Instagram\n2) Indicação\n...") em vez de botões reais —
  // cliente respondendo só o número ("1", "2"...) é um sinal determinístico
  // e inequívoco de qual opção ele quer, na mesma ordem 1-indexed em que
  // service.ts's sendStepQuestion renderizou a lista. Checa isso ANTES do
  // match textual pra não deixar essa resposta óbvia cair no fallback LLM.
  const asNumber = Number(trimmed);
  if (trimmed !== "" && Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    const byPosition = options[asNumber - 1];
    if (byPosition) return byPosition.id;
  }

  const normalized = normalize(text);
  const direct = options.find(
    (o) => normalize(o.id) === normalized || normalize(o.label) === normalized,
  );
  if (direct) return direct.id;

  // Whole-word boundary matching to avoid false positives from substrings
  // (e.g., "senao" should not match "nao" or "necessitei" match "site")
  const partial = options.find((o) => {
    const normalizedLabel = normalize(o.label);
    // Escape regex special characters in the label to safely build pattern
    const escaped = normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Check if normalized label appears as whole word(s) in the text
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    return regex.test(normalized);
  });
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

/**
 * Valida se uma resposta de texto livre faz sentido pra pergunta feita (steps
 * `kind: "text"`, ex: nome, quem indicou). Sem isso, qualquer texto não-vazio
 * era aceito como resposta válida e o roteiro avançava mesmo com respostas
 * incoerentes (ex: cliente manda outra pergunta ou uma mensagem aleatória no
 * lugar do nome) — dava a impressão de um bot "burro". Falha do LLM não deve
 * travar o cliente no mesmo step pra sempre, então assume coerente (true).
 */
export async function isCoherentTextAnswer(question: string, text: string): Promise<boolean> {
  try {
    const result = await generateObject({
      model: getLanguageModel(),
      schema: z.object({ coherent: z.boolean() }),
      prompt: `O cliente foi perguntado: "${question}"

Ele respondeu: "${text}"

Essa resposta faz sentido como resposta a essa pergunta (não é uma pergunta de volta, mensagem fora de contexto, ou algo sem relação)? Responda true ou false.`,
    });
    return result.object.coherent;
  } catch {
    return true;
  }
}
