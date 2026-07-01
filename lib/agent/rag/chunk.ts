import { logError } from "@/lib/logger";
import { normalizeText } from "./chunking/normalize";
import { splitBlocks } from "./chunking/blocks";
import { splitSentences } from "./chunking/sentences";
import { boundaryOnlyAssemble, semanticAssemble } from "./chunking/semantic-assemble";
import { DEFAULT_OPTS, type ChunkResult, type Sentence } from "./chunking/types";

export type { ChunkResult } from "./chunking/types";

/**
 * Pipeline boundary-aware + semantic chunking (Sub-F).
 * Substitui o `chunkText` antigo (800 chars fixos com word-boundary).
 *
 * Fluxo:
 *  A) normalizeText — preserva \n\n
 *  B) splitBlocks   — heading/paragraph/list-item
 *  C) splitSentences — pt-BR + en, preserva abreviações/decimais/urls
 *  D) semanticAssemble — embed batch, breakpoints por percentile, envelope [minSize, maxSize]
 *
 * Se OpenAI falhar em (D), cai pra `boundaryOnlyAssemble` (sem embedding).
 */
export async function chunkDocument(rawText: string): Promise<ChunkResult> {
  const text = normalizeText(rawText);
  if (text.length === 0) {
    return { chunks: [], meta: { totalSentences: 0, semanticBreakpoints: 0, fallbackUsed: false } };
  }
  if (text.length <= DEFAULT_OPTS.targetSize) {
    return {
      chunks: [text],
      meta: { totalSentences: 1, semanticBreakpoints: 0, fallbackUsed: false },
    };
  }

  const blocks = splitBlocks(text);
  const sentences: Sentence[] = blocks.flatMap((b, blockId) =>
    splitSentences(b.text).map((s) => ({ blockId, text: s, kind: b.kind })),
  );

  try {
    return await semanticAssemble(sentences, DEFAULT_OPTS);
  } catch (err) {
    logError("agent.chunk.semantic-fallback", err);
    return boundaryOnlyAssemble(sentences, DEFAULT_OPTS);
  }
}

/**
 * @deprecated Use `chunkDocument()`. Wrapper mantido pra compat de imports antigos.
 * Os parâmetros `size` e `overlap` são ignorados — defaults internos são sempre usados.
 */
export async function chunkText(
  text: string,
  _size: number = 800,
  _overlap: number = 120,
): Promise<string[]> {
  const result = await chunkDocument(text);
  return result.chunks;
}
