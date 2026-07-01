import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/agent/rag/embed", () => ({
  embedMany_: vi.fn(async (texts: string[]) =>
    texts.map(() => new Array(1536).fill(0.001)),
  ),
  embedText: vi.fn(),
}));

import { chunkDocument, chunkText } from "@/lib/agent/rag/chunk";

describe("chunkDocument (novo contrato)", () => {
  test("texto vazio retorna chunks=[]", async () => {
    const r = await chunkDocument("");
    expect(r.chunks).toEqual([]);
    expect(r.meta.totalSentences).toBe(0);
  });

  test("texto curto (<=targetSize) vira 1 chunk", async () => {
    const r = await chunkDocument("Pequeno parágrafo simples.");
    expect(r.chunks).toEqual(["Pequeno parágrafo simples."]);
    expect(r.meta.fallbackUsed).toBe(false);
  });

  test("texto longo vira múltiplos chunks dentro de [minSize, maxSize]", async () => {
    const para = "Esta é uma frase longa que ocupa um espaço considerável. ".repeat(50);
    const r = await chunkDocument(para);
    expect(r.chunks.length).toBeGreaterThan(1);
    for (const c of r.chunks) {
      expect(c.length).toBeLessThanOrEqual(1200 + 200);
    }
  });

  test("preserva quebras de parágrafo (\\n\\n) na estrutura interna", async () => {
    const text = "Primeiro parágrafo aqui.\n\nSegundo parágrafo aqui.";
    const r = await chunkDocument(text);
    expect(r.chunks).toHaveLength(1);
    expect(r.chunks[0]).toContain("Primeiro parágrafo");
    expect(r.chunks[0]).toContain("Segundo parágrafo");
  });
});

describe("chunkText (deprecated wrapper)", () => {
  test("agora é async — retorna Promise<string[]>", async () => {
    const result = await chunkText("texto curto");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["texto curto"]);
  });

  test("parâmetros size/overlap são ignorados (compat)", async () => {
    const result = await chunkText("Pequeno.", 100, 20);
    expect(result).toEqual(["Pequeno."]);
  });
});
