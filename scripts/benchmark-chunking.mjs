#!/usr/bin/env node
// Benchmark comparativo: algoritmo novo (chunkDocument) vs antigo (replica inline).
// Pra rodar:
//   npx tsx scripts/benchmark-chunking.ts
// (Se este .mjs falhar por import de TS, renomeie pra .ts e use tsx.)
//
// Imprime tabela com métricas pra calibrar parâmetros (percentile, min/max).

import { chunkDocument } from "../lib/agent/rag/chunk.js";

const FIXTURE = `Política de Devolução

Você pode devolver qualquer produto em até 30 dias após a compra.

Procedimento de Troca

1. Entre em contato com o suporte por email.
2. Receba o código de retorno.
3. Embale o produto na embalagem original.

Garantia

Todos os produtos têm garantia mínima de 12 meses. Em caso de defeito, entre em contato com a Assistência Técnica autorizada.

Atendimento 24 Horas

Para emergências, ligue 0800-123-4567. Atendimento todos os dias.`.repeat(5);

// Replica do algoritmo antigo (chunkText pre-Sub-F)
function chunkTextLegacy(text, size = 800, overlap = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= size) return [normalized];
  const chunks = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(cursor + size, normalized.length);
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > cursor) end = lastSpace;
    }
    const chunk = normalized.slice(cursor, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= normalized.length) break;
    cursor = end - overlap;
    if (cursor < 0) cursor = 0;
  }
  return chunks;
}

function countCutSentences(chunks) {
  let cuts = 0;
  for (const c of chunks) {
    const trimmed = c.trim();
    if (trimmed.length === 0) continue;
    if (/^[a-zà-ÿ]/.test(trimmed)) cuts++;
    if (!/[.!?]$/.test(trimmed)) cuts++;
  }
  return cuts;
}

function countHeadingsKept(chunks) {
  let kept = 0;
  for (const c of chunks) {
    const firstLine = c.split("\n")[0]?.trim() ?? "";
    if (/^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s]+$/.test(firstLine) && firstLine.length < 80) kept++;
    if (/^\d+(\.\d+)*\s/.test(firstLine)) kept++;
  }
  return kept;
}

async function benchmark(label, chunks) {
  const avgSize = Math.round(chunks.reduce((s, c) => s + c.length, 0) / chunks.length);
  const minSize = Math.min(...chunks.map((c) => c.length));
  const maxSize = Math.max(...chunks.map((c) => c.length));
  return {
    label,
    n: chunks.length,
    avgSize,
    minSize,
    maxSize,
    cuts: countCutSentences(chunks),
    headings: countHeadingsKept(chunks),
  };
}

const legacy = chunkTextLegacy(FIXTURE);
const novoResult = await chunkDocument(FIXTURE);

const a = await benchmark("Antigo", legacy);
const b = await benchmark("Novo", novoResult.chunks);

console.log("\n=== Benchmark Chunking ===\n");
console.log(`Algoritmo  Chunks  Avg size  Min/Max     Cortadas  Headings inicio chunk`);
console.log(`${a.label.padEnd(10)} ${String(a.n).padEnd(7)} ${String(a.avgSize).padEnd(9)} ${a.minSize}/${a.maxSize}     ${String(a.cuts).padEnd(9)} ${a.headings}`);
console.log(`${b.label.padEnd(10)} ${String(b.n).padEnd(7)} ${String(b.avgSize).padEnd(9)} ${b.minSize}/${b.maxSize}     ${String(b.cuts).padEnd(9)} ${b.headings}`);
console.log(`\nMeta (algoritmo novo): sentences=${novoResult.meta.totalSentences} breakpoints=${novoResult.meta.semanticBreakpoints} fallback=${novoResult.meta.fallbackUsed}\n`);
