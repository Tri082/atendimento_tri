/**
 * Limpa whitespace PRESERVANDO estrutura de parágrafo.
 * Diferente do antigo `chunkText` que apaga TODAS as quebras de linha.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
