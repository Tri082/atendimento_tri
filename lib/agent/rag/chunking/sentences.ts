const ABBREVIATIONS = new Set([
  "dr", "dra", "sr", "sra", "srta",
  "prof", "profa",
  "av", "r", "rua", "n", "no", "nº",
  "p", "pex", "ex", "i", "e",
  "etc",
  "eua", "ue", "br",
  "sa", "ltda", "me",
]);

const PROTECTED_TOKENS_RE = [
  /https?:\/\/\S+/g,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  /\d{1,3}(?:[.,]\d{1,3})+%?/g,
  /\b(?:[A-Z]\.){2,}/g,
];

function maskProtected(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  let masked = text;
  for (const re of PROTECTED_TOKENS_RE) {
    masked = masked.replace(re, (m) => {
      const idx = tokens.length;
      tokens.push(m);
      return `__TKN${idx}__`;
    });
  }
  return { masked, tokens };
}

function unmask(text: string, tokens: string[]): string {
  return text.replace(/__TKN(\d+)__/g, (_, i) => tokens[Number(i)] ?? "");
}

function isAbbreviationBefore(text: string, dotIdx: number): boolean {
  let start = dotIdx - 1;
  while (start >= 0 && /[A-Za-zÀ-ÿ]/.test(text[start]!)) start--;
  const word = text.slice(start + 1, dotIdx).toLowerCase();
  return ABBREVIATIONS.has(word);
}

/**
 * Split em frases respeitando pontuação .!? mas preservando:
 * - URLs, emails, decimais, siglas com ponto (S.A.)
 * - Abreviações conhecidas (Dr., Sr., p.ex., etc.)
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const { masked, tokens } = maskProtected(trimmed);

  const sentences: string[] = [];
  let cursor = 0;
  let i = 0;

  while (i < masked.length) {
    const ch = masked[i]!;
    if (ch === "." || ch === "!" || ch === "?") {
      if (ch === "." && isAbbreviationBefore(masked, i)) {
        i++;
        continue;
      }

      let j = i + 1;
      while (j < masked.length && masked[j] === " ") j++;

      const isEnd = j >= masked.length;
      const next = isEnd ? "" : masked[j]!;
      const looksLikeBoundary =
        isEnd || /[A-ZÀ-Ý]/.test(next) || next === "." || next === "!" || next === "?";

      if (looksLikeBoundary) {
        const piece = masked.slice(cursor, i + 1).trim();
        if (piece.length > 0 && /[A-Za-zÀ-ÿ0-9]/.test(piece)) {
          sentences.push(unmask(piece, tokens));
        }
        let k = j;
        while (k < masked.length && /[\s.!?]/.test(masked[k]!)) k++;
        cursor = k;
        i = k;
        continue;
      }
    }
    i++;
  }

  if (cursor < masked.length) {
    const tail = masked.slice(cursor).trim();
    if (tail.length > 0) sentences.push(unmask(tail, tokens));
  }

  return sentences;
}
