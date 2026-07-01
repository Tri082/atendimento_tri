import type { Block } from "./types";

const HEADING_NUMBER_RE = /^\d+(\.\d+)*\.?\s+\S/;
const LIST_ITEM_RE = /^(?:[-*•]|\d+[.)])\s+\S/;
const MAX_HEADING_LEN = 80;
const MIN_UPPERCASE_WORDS_FOR_HEADING = 3;

function isUppercaseHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (trimmed !== trimmed.toUpperCase()) return false;
  if (!/[A-ZÀ-Ý]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter((w) => /[A-ZÀ-Ý]/.test(w));
  return words.length >= MIN_UPPERCASE_WORDS_FOR_HEADING;
}

function isListItem(line: string): boolean {
  return LIST_ITEM_RE.test(line);
}

function isNumberedHeading(line: string): boolean {
  return HEADING_NUMBER_RE.test(line);
}

function isShortStandaloneHeading(line: string, nextBlank: boolean): boolean {
  if (!nextBlank) return false;
  if (line.length >= MAX_HEADING_LEN) return false;
  if (/[.!?:;]$/.test(line.trim())) return false;
  return true;
}

function isAllUppercaseToken(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  if (trimmed !== trimmed.toUpperCase()) return false;
  return /[A-ZÀ-Ý]/.test(trimmed);
}

export function splitBlocks(text: string): Block[] {
  if (text.trim().length === 0) return [];

  const rawBlocks = text.split(/\n{2,}/).map((b) => b.trim()).filter((b) => b.length > 0);

  const blocks: Block[] = [];

  for (const block of rawBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    if (lines.length === 1) {
      const line = lines[0]!;
      if (isNumberedHeading(line)) {
        blocks.push({ kind: "heading", text: line });
        continue;
      }
      if (isUppercaseHeading(line)) {
        blocks.push({ kind: "heading", text: line });
        continue;
      }
      if (isAllUppercaseToken(line)) {
        blocks.push({ kind: "paragraph", text: line });
        continue;
      }
      if (isListItem(line)) {
        blocks.push({ kind: "list-item", text: line });
        continue;
      }
      if (isShortStandaloneHeading(line, true)) {
        blocks.push({ kind: "heading", text: line });
        continue;
      }
      blocks.push({ kind: "paragraph", text: line });
      continue;
    }

    const allListItems = lines.every(isListItem);
    if (allListItems) {
      for (const line of lines) {
        blocks.push({ kind: "list-item", text: line });
      }
      continue;
    }

    blocks.push({ kind: "paragraph", text: lines.join(" ") });
  }

  return blocks;
}
