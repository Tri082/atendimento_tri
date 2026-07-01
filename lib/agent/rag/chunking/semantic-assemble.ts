import { embedMany_ } from "@/lib/agent/rag/embed";
import type { ChunkResult, Sentence, SemanticOpts } from "./types";

/**
 * Quebra forçada de sentence gigante (sem pontuação interna) preferindo
 * word-boundary. Usado quando uma única sentence passa de maxSize.
 */
export function splitOversizedSentence(sentence: string, maxSize: number): string[] {
  if (sentence.length <= maxSize) return [sentence];
  const out: string[] = [];
  let cursor = 0;
  while (cursor < sentence.length) {
    let end = Math.min(cursor + maxSize, sentence.length);
    if (end < sentence.length) {
      const lastSpace = sentence.lastIndexOf(" ", end);
      if (lastSpace > cursor) end = lastSpace;
    }
    const piece = sentence.slice(cursor, end).trim();
    if (piece.length > 0) out.push(piece);
    cursor = end;
    while (cursor < sentence.length && sentence[cursor] === " ") cursor++;
  }
  return out;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx]!;
}

function preprocessSentences(sentences: Sentence[], maxSize: number): Sentence[] {
  const out: Sentence[] = [];
  for (const s of sentences) {
    if (s.text.length <= maxSize) {
      out.push(s);
      continue;
    }
    const sub = splitOversizedSentence(s.text, maxSize);
    for (const text of sub) {
      out.push({ blockId: s.blockId, kind: s.kind, text });
    }
  }
  return out;
}

interface Builder {
  parts: string[];
  length: number;
  sentenceIdxs: number[];
}

function startNewChunk(): Builder {
  return { parts: [], length: 0, sentenceIdxs: [] };
}

function commitChunk(builder: Builder): string {
  return builder.parts.join(" ").trim();
}

function applyOverlap(
  prevSentences: Sentence[],
  prevIdxs: number[],
  overlapMaxChars: number,
): { texts: string[]; totalLen: number } {
  const texts: string[] = [];
  let total = 0;
  for (let i = prevIdxs.length - 1; i >= 0 && texts.length < 2; i--) {
    const idx = prevIdxs[i]!;
    const t = prevSentences[idx]!.text;
    if (total + t.length + (texts.length > 0 ? 1 : 0) > overlapMaxChars) break;
    texts.unshift(t);
    total += t.length + (texts.length > 1 ? 1 : 0);
  }
  return { texts, totalLen: total };
}

function commonAssemble(
  sentences: Sentence[],
  breakpoints: Set<number>,
  opts: SemanticOpts,
): string[] {
  const chunks: string[] = [];
  let builder = startNewChunk();

  function flushChunk(): void {
    const out = commitChunk(builder);
    if (out.length > 0) chunks.push(out);
  }

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]!;
    const addLen = sentence.text.length + (builder.length > 0 ? 1 : 0);

    if (builder.length === 0) {
      builder.parts.push(sentence.text);
      builder.length += sentence.text.length;
      builder.sentenceIdxs.push(i);
      continue;
    }

    // Caso 2: força break ao ultrapassar maxSize
    if (builder.length + addLen > opts.maxSize) {
      flushChunk();
      const prevIdxs = builder.sentenceIdxs;
      builder = startNewChunk();
      const { texts } = applyOverlap(sentences, prevIdxs, opts.overlapMaxChars);
      for (const t of texts) {
        builder.parts.push(t);
        builder.length += t.length + (builder.parts.length > 1 ? 1 : 0);
      }
      builder.parts.push(sentence.text);
      builder.length += sentence.text.length + (builder.parts.length > 1 ? 1 : 0);
      builder.sentenceIdxs.push(i);
      continue;
    }

    // Caso 3: chunk atingiu minSize e essa sentença é breakpoint?
    if (builder.length >= opts.minSize && breakpoints.has(i)) {
      flushChunk();
      const prevIdxs = builder.sentenceIdxs;
      builder = startNewChunk();
      const { texts } = applyOverlap(sentences, prevIdxs, opts.overlapMaxChars);
      for (const t of texts) {
        builder.parts.push(t);
        builder.length += t.length + (builder.parts.length > 1 ? 1 : 0);
      }
      builder.parts.push(sentence.text);
      builder.length += sentence.text.length + (builder.parts.length > 1 ? 1 : 0);
      builder.sentenceIdxs.push(i);
      continue;
    }

    // Caso 4: block boundary com heading → break se chunk >= minSize
    const prevSentence = sentences[i - 1]!;
    const blockChanged = sentence.blockId !== prevSentence.blockId;
    if (blockChanged && sentence.kind === "heading" && builder.length >= opts.minSize) {
      flushChunk();
      const prevIdxs = builder.sentenceIdxs;
      builder = startNewChunk();
      const { texts } = applyOverlap(sentences, prevIdxs, opts.overlapMaxChars);
      for (const t of texts) {
        builder.parts.push(t);
        builder.length += t.length + (builder.parts.length > 1 ? 1 : 0);
      }
      builder.parts.push(sentence.text);
      builder.length += sentence.text.length + (builder.parts.length > 1 ? 1 : 0);
      builder.sentenceIdxs.push(i);
      continue;
    }

    // Caso default: agrega
    builder.parts.push(sentence.text);
    builder.length += addLen;
    builder.sentenceIdxs.push(i);
  }

  flushChunk();
  return chunks;
}

export async function semanticAssemble(
  rawSentences: Sentence[],
  opts: SemanticOpts,
): Promise<ChunkResult> {
  if (rawSentences.length === 0) {
    return { chunks: [], meta: { totalSentences: 0, semanticBreakpoints: 0, fallbackUsed: false } };
  }

  const sentences = preprocessSentences(rawSentences, opts.maxSize);

  if (sentences.length === 1) {
    return {
      chunks: [sentences[0]!.text],
      meta: { totalSentences: 1, semanticBreakpoints: 0, fallbackUsed: false },
    };
  }

  const embeddings = await embedMany_(sentences.map((s) => s.text));

  const sims: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    sims.push(cosineSimilarity(embeddings[i]!, embeddings[i + 1]!));
  }

  const threshold = percentile(sims, opts.thresholdPercentile);
  const breakpoints = new Set<number>();
  for (let i = 0; i < sims.length; i++) {
    if (sims[i]! <= threshold) {
      breakpoints.add(i + 1);
    }
  }

  const chunks = commonAssemble(sentences, breakpoints, opts);

  return {
    chunks,
    meta: {
      totalSentences: sentences.length,
      semanticBreakpoints: breakpoints.size,
      fallbackUsed: false,
    },
  };
}

export async function boundaryOnlyAssemble(
  rawSentences: Sentence[],
  opts: SemanticOpts,
): Promise<ChunkResult> {
  if (rawSentences.length === 0) {
    return { chunks: [], meta: { totalSentences: 0, semanticBreakpoints: 0, fallbackUsed: true } };
  }
  const sentences = preprocessSentences(rawSentences, opts.maxSize);
  const chunks = commonAssemble(sentences, new Set(), opts);
  return {
    chunks,
    meta: {
      totalSentences: sentences.length,
      semanticBreakpoints: 0,
      fallbackUsed: true,
    },
  };
}
