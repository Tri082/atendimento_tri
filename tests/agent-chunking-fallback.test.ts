import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Sentence } from "@/lib/agent/rag/chunking/types";
import { DEFAULT_OPTS } from "@/lib/agent/rag/chunking/types";

vi.mock("@/lib/agent/rag/embed", () => ({
  embedMany_: vi.fn(),
  embedText: vi.fn(),
}));

import { embedMany_ } from "@/lib/agent/rag/embed";
import { boundaryOnlyAssemble } from "@/lib/agent/rag/chunking/semantic-assemble";

const mocked = vi.mocked(embedMany_);

function makeSentences(texts: string[]): Sentence[] {
  return texts.map((text, i) => ({ blockId: i, kind: "paragraph", text }));
}

describe("boundaryOnlyAssemble", () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  test("não chama embedding API", async () => {
    const sentences = makeSentences(["Frase 1.", "Frase 2."]);
    const result = await boundaryOnlyAssemble(sentences, DEFAULT_OPTS);
    expect(mocked).not.toHaveBeenCalled();
    expect(result.meta.fallbackUsed).toBe(true);
  });

  test("agrupa sentences respeitando maxSize", async () => {
    const big = "A".repeat(400);
    const sentences = makeSentences([big, big, big, big]);
    const result = await boundaryOnlyAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of result.chunks) {
      expect(c.length).toBeLessThanOrEqual(DEFAULT_OPTS.maxSize + DEFAULT_OPTS.overlapMaxChars);
    }
  });

  test("quebra em block boundary quando chunk passou de minSize", async () => {
    const sentences: Sentence[] = [
      { blockId: 0, kind: "paragraph", text: "A".repeat(450) },
      { blockId: 1, kind: "heading", text: "Próxima seção" },
      { blockId: 1, kind: "paragraph", text: "B".repeat(450) },
    ];
    const result = await boundaryOnlyAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("zero perda de conteúdo (todas as sentences acabam em algum chunk)", async () => {
    const sentences = makeSentences(["alfa", "beta", "gamma", "delta"]);
    const result = await boundaryOnlyAssemble(sentences, DEFAULT_OPTS);
    const joined = result.chunks.join(" ");
    for (const s of ["alfa", "beta", "gamma", "delta"]) {
      expect(joined).toContain(s);
    }
  });
});
