export type BlockKind = "heading" | "paragraph" | "list-item";

export interface Block {
  kind: BlockKind;
  text: string;
}

export interface Sentence {
  blockId: number;
  kind: BlockKind;
  text: string;
}

export interface ChunkResult {
  chunks: string[];
  meta: {
    totalSentences: number;
    semanticBreakpoints: number;
    fallbackUsed: boolean;
  };
}

export interface SemanticOpts {
  targetSize: number;
  minSize: number;
  maxSize: number;
  thresholdPercentile: number;
  overlapMaxChars: number;
}

export const DEFAULT_OPTS: SemanticOpts = {
  targetSize: 800,
  minSize: 400,
  maxSize: 1200,
  thresholdPercentile: 25,
  overlapMaxChars: 200,
};
