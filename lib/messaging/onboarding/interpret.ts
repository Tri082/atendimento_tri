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

const GREETING_BIGRAMS = new Set([
  "bom dia",
  "boa tarde",
  "boa noite",
  "tudo bem",
  "como vai",
  "e ai",
]);

const GREETING_WORDS = new Set(["oi", "ola", "opa", "oii", "eae", "salve", "hey", "hello"]);

/**
 * Detecta se o texto é SÓ saudação/papo educado (ex: "bom dia", "tudo bem?",
 * "oi, tudo bem?") sem nenhuma resposta de verdade junto. Usado antes de
 * interpretar a resposta de um step do onboarding — sem isso, um cliente que
 * cumprimenta antes de responder ("bom dia, tudo bem?") recebia um "não
 * entendi" na cara, porque nem "bom dia" nem "tudo bem" batem com nome/opção
 * nenhuma. Puramente determinístico (sem LLM) — mais rápido e previsível que
 * chamar o modelo pra isso.
 */
export function isPureGreeting(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 0) return false;

  let i = 0;
  while (i < words.length) {
    const bigram = i + 1 < words.length ? `${words[i]} ${words[i + 1]}` : "";
    if (GREETING_BIGRAMS.has(bigram)) {
      i += 2;
      continue;
    }
    if (GREETING_WORDS.has(words[i]!)) {
      i += 1;
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Detecta se o texto parece uma mensagem de verdade (tem pelo menos uma
 * palavra reconhecível) em vez de vazio/gibberish (ex: "???", "kkkkkkk",
 * "123"). Usado pra distinguir "cliente disse algo coerente mas fora do que
 * foi perguntado" (ex: "gostaria de fazer um pedido" quando ela pediu o
 * nome) de "não deu pra entender nada" — no primeiro caso não faz sentido
 * pedir desculpa com "não entendi", só reconhecer e redirecionar pra
 * pergunta pendente. Puramente determinístico (sem LLM).
 */
export function looksLikeRealMessage(text: string): boolean {
  const words = text.match(/\p{L}{2,}/gu) ?? [];
  return words.some((w) => new Set(w.toLowerCase()).size > 1);
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
