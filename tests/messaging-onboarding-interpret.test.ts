import { describe, expect, test, vi } from "vitest";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: vi.fn() };
});
vi.mock("@/lib/llm", () => ({ getLanguageModel: vi.fn(() => "fake-model") }));

import { generateObject } from "ai";
import {
  matchChoiceByText,
  interpretChoiceAnswer,
  isPureGreeting,
  looksLikeRealMessage,
} from "@/lib/messaging/onboarding/interpret";

const OPTIONS = [
  { id: "instagram", label: "Instagram" },
  { id: "indicacao", label: "Indicação" },
  { id: "site", label: "Site" },
];

describe("matchChoiceByText", () => {
  test("casa por label exata, ignorando acentos e caixa", () => {
    expect(matchChoiceByText(OPTIONS, "indicação")).toBe("indicacao");
    expect(matchChoiceByText(OPTIONS, "INSTAGRAM")).toBe("instagram");
  });

  test("casa por substring com word boundaries (não substring bruta)", () => {
    expect(matchChoiceByText(OPTIONS, "foi pelo site de vocês")).toBe("site");
  });

  test("não casa 'site' em 'necessitei' (substring falso)", () => {
    expect(matchChoiceByText(OPTIONS, "necessitei de mais info")).toBeNull();
  });

  test("retorna null se não achar nada", () => {
    expect(matchChoiceByText(OPTIONS, "não sei explicar")).toBeNull();
  });

  test("resolve resposta numérica bare ('1') pra primeira opção (steps >3 opções viram texto numerado)", () => {
    expect(matchChoiceByText(OPTIONS, "1")).toBe("instagram");
  });

  test("resolve número no meio do range ('3') pra terceira opção", () => {
    expect(matchChoiceByText(OPTIONS, "3")).toBe("site");
  });

  test("número fora do range (maior que options.length) retorna null", () => {
    expect(matchChoiceByText(OPTIONS, "99")).toBeNull();
  });

  test("número fora do range ('0') retorna null", () => {
    expect(matchChoiceByText(OPTIONS, "0")).toBeNull();
  });
});

describe("matchChoiceByText (first_order_check edge cases)", () => {
  const FIRST_ORDER_OPTIONS = [
    { id: "sim", label: "Sim" },
    { id: "nao", label: "Não" },
  ];

  test("não casa 'nao' em 'senão' (substring falso)", () => {
    expect(matchChoiceByText(FIRST_ORDER_OPTIONS, "senão")).toBeNull();
  });

  test("casa 'sim' em 'sim, pode ser' (word boundary)", () => {
    expect(matchChoiceByText(FIRST_ORDER_OPTIONS, "sim, pode ser")).toBe("sim");
  });

  test("não casa 'sim' em 'simples' (substring falso)", () => {
    expect(matchChoiceByText(FIRST_ORDER_OPTIONS, "é simples")).toBeNull();
  });

  test("casa 'nao' exata (label com acento)", () => {
    expect(matchChoiceByText(FIRST_ORDER_OPTIONS, "não")).toBe("nao");
  });
});

describe("isPureGreeting", () => {
  test("saudações simples retornam true", () => {
    expect(isPureGreeting("Oi")).toBe(true);
    expect(isPureGreeting("oi")).toBe(true);
    expect(isPureGreeting("Olá")).toBe(true);
    expect(isPureGreeting("Bom dia")).toBe(true);
    expect(isPureGreeting("boa tarde")).toBe(true);
    expect(isPureGreeting("Boa noite")).toBe(true);
  });

  test("combinação de saudações com pontuação retorna true", () => {
    expect(isPureGreeting("Bom dia, tudo bem?")).toBe(true);
    expect(isPureGreeting("Oi! Tudo bem?")).toBe(true);
  });

  test("saudação com conteúdo real junto retorna false", () => {
    expect(isPureGreeting("Oi, meu nome é João")).toBe(false);
    expect(isPureGreeting("Bom dia! Já deixou em loja")).toBe(false);
  });

  test("resposta real (nome, sim/não) retorna false", () => {
    expect(isPureGreeting("Maria")).toBe(false);
    expect(isPureGreeting("Sim")).toBe(false);
    expect(isPureGreeting("não")).toBe(false);
  });

  test("string vazia retorna false", () => {
    expect(isPureGreeting("")).toBe(false);
    expect(isPureGreeting("   ")).toBe(false);
  });
});

describe("looksLikeRealMessage", () => {
  test("frase coerente fora de contexto retorna true", () => {
    expect(looksLikeRealMessage("Gostaria de fazer um pedido")).toBe(true);
    expect(looksLikeRealMessage("Maria")).toBe(true);
    expect(looksLikeRealMessage("qual o prazo de entrega?")).toBe(true);
  });

  test("string vazia ou só espaço retorna false", () => {
    expect(looksLikeRealMessage("")).toBe(false);
    expect(looksLikeRealMessage("   ")).toBe(false);
  });

  test("texto muito curto (1 letra) retorna false", () => {
    expect(looksLikeRealMessage("a")).toBe(false);
  });

  test("só pontuação/número, sem palavra, retorna false", () => {
    expect(looksLikeRealMessage("???")).toBe(false);
    expect(looksLikeRealMessage("123")).toBe(false);
  });

  test("caractere único repetido (kkkk) retorna false", () => {
    expect(looksLikeRealMessage("kkkkkkk")).toBe(false);
  });
});

describe("interpretChoiceAnswer", () => {
  test("usa match determinístico sem chamar LLM quando possível", async () => {
    const result = await interpretChoiceAnswer(OPTIONS, "Instagram");
    expect(result).toBe("instagram");
    expect(generateObject).not.toHaveBeenCalled();
  });

  test("cai pro LLM quando não há match determinístico", async () => {
    (generateObject as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: { optionId: "indicacao" },
    });
    const result = await interpretChoiceAnswer(OPTIONS, "foi minha amiga que falou de vocês");
    expect(result).toBe("indicacao");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  test("retorna null se o LLM também não achar", async () => {
    (generateObject as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: { optionId: null },
    });
    const result = await interpretChoiceAnswer(OPTIONS, "sei lá");
    expect(result).toBeNull();
  });

  test("retorna null se o LLM falhar (não propaga exception)", async () => {
    (generateObject as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));
    const result = await interpretChoiceAnswer(OPTIONS, "sei lá");
    expect(result).toBeNull();
  });
});
