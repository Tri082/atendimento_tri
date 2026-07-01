import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Sentence, SemanticOpts } from "@/lib/agent/rag/chunking/types";
import { DEFAULT_OPTS } from "@/lib/agent/rag/chunking/types";

// Mock embedMany_ ANTES do import do módulo testado
vi.mock("@/lib/agent/rag/embed", () => ({
  embedMany_: vi.fn(),
  embedText: vi.fn(),
}));

import { embedMany_ } from "@/lib/agent/rag/embed";
import { semanticAssemble, splitOversizedSentence } from "@/lib/agent/rag/chunking/semantic-assemble";

const mocked = vi.mocked(embedMany_);

function makeSentences(texts: string[]): Sentence[] {
  return texts.map((text, i) => ({ blockId: i, kind: "paragraph", text }));
}

function vec(values: number[]): number[] {
  const out = new Array(1536).fill(0);
  values.forEach((v, i) => { out[i] = v; });
  return out;
}

const SIM_A = vec([1, 0, 0, 0]);
const SIM_B = vec([0, 1, 0, 0]);

describe("semanticAssemble", () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  test("sentences abaixo do minSize ficam num único chunk", async () => {
    const sentences = makeSentences(["Frase curta.", "Outra curta."]);
    mocked.mockResolvedValue([SIM_A, SIM_A]);
    const result = await semanticAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks).toHaveLength(1);
    expect(result.meta.totalSentences).toBe(2);
    expect(result.meta.fallbackUsed).toBe(false);
  });

  test("topic shift gera breakpoint quando chunk já passou de minSize", async () => {
    const longA = "A".repeat(250);
    const longB = "B".repeat(250);
    const sentences = makeSentences([longA, longA, longB, longB]);
    mocked.mockResolvedValue([SIM_A, SIM_A, SIM_B, SIM_B]);
    const result = await semanticAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    expect(result.meta.semanticBreakpoints).toBeGreaterThanOrEqual(1);
  });

  test("força break ao bater maxSize mesmo sem breakpoint", async () => {
    const big = "X".repeat(400);
    const sentences = makeSentences([big, big, big, big]);
    mocked.mockResolvedValue([SIM_A, SIM_A, SIM_A, SIM_A]);
    const result = await semanticAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result.chunks) {
      expect(chunk.length).toBeLessThanOrEqual(DEFAULT_OPTS.maxSize + DEFAULT_OPTS.overlapMaxChars);
    }
  });

  test("heading + parágrafo curto ficam no mesmo chunk se cabem", async () => {
    const sentences: Sentence[] = [
      { blockId: 0, kind: "heading", text: "Política de devolução" },
      { blockId: 1, kind: "paragraph", text: "Você pode devolver em até 30 dias." },
    ];
    mocked.mockResolvedValue([SIM_A, SIM_A]);
    const result = await semanticAssemble(sentences, DEFAULT_OPTS);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toContain("Política de devolução");
    expect(result.chunks[0]).toContain("até 30 dias");
  });

  test("overlap aplica últimas frases do chunk anterior", async () => {
    const opts: SemanticOpts = { ...DEFAULT_OPTS, targetSize: 200, minSize: 100, maxSize: 250 };
    const sentences = makeSentences([
      "A".repeat(120),
      "B".repeat(120),
      "C".repeat(120),
    ]);
    mocked.mockResolvedValue([SIM_A, SIM_B, SIM_A]);
    const result = await semanticAssemble(sentences, opts);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("meta.totalSentences reflete input", async () => {
    const sentences = makeSentences(["um.", "dois.", "três.", "quatro."]);
    mocked.mockResolvedValue([SIM_A, SIM_A, SIM_A, SIM_A]);
    const result = await semanticAssemble(sentences, DEFAULT_OPTS);
    expect(result.meta.totalSentences).toBe(4);
  });

  test("input vazio retorna chunks vazios", async () => {
    const result = await semanticAssemble([], DEFAULT_OPTS);
    expect(result.chunks).toEqual([]);
    expect(result.meta.totalSentences).toBe(0);
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe("splitOversizedSentence", () => {
  test("sentence menor que maxSize retorna ela mesma", () => {
    expect(splitOversizedSentence("frase normal", 100)).toEqual(["frase normal"]);
  });

  test("sentence gigante quebra em sub-strings <= maxSize", () => {
    const huge = "palavra ".repeat(300);
    const out = splitOversizedSentence(huge.trim(), 800);
    expect(out.length).toBeGreaterThanOrEqual(3);
    for (const part of out) {
      expect(part.length).toBeLessThanOrEqual(800);
    }
  });

  test("quebra preferindo word-boundary", () => {
    const text = "palavra ".repeat(100).trim();
    const out = splitOversizedSentence(text, 100);
    for (const part of out) {
      expect(part.endsWith(" ")).toBe(false);
      expect(part.startsWith(" ")).toBe(false);
    }
  });
});
