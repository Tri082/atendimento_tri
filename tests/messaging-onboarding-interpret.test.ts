import { describe, expect, test, vi } from "vitest";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateObject: vi.fn() };
});
vi.mock("@/lib/llm", () => ({ getLanguageModel: vi.fn(() => "fake-model") }));

import { generateObject } from "ai";
import { matchChoiceByText, interpretChoiceAnswer } from "@/lib/messaging/onboarding/interpret";

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

  test("casa por substring", () => {
    expect(matchChoiceByText(OPTIONS, "foi pelo site de vocês")).toBe("site");
  });

  test("retorna null se não achar nada", () => {
    expect(matchChoiceByText(OPTIONS, "não sei explicar")).toBeNull();
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
