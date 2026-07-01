import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { embedText } from "./embed";

export interface RagHit {
  kind: "faq" | "doc";
  source_id: string;
  title: string;
  content: string;
  similarity: number;
}

/**
 * Busca top-K trechos relevantes (FAQ + chunks de docs) DO AGENTE específico.
 */
export async function retrieveContext(
  agentId: string,
  query: string,
  k = 5,
): Promise<RagHit[]> {
  if (!query.trim()) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch (err) {
    logError("agent.retrieve.embed", err);
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agent_search_kb", {
    _agent_id: agentId,
    _query_embedding: queryEmbedding as unknown as string,
    _limit: k,
    _min_similarity: 0.5,
  });
  if (error) {
    logError("agent.retrieve.rpc", error);
    return [];
  }
  return (data ?? []) as RagHit[];
}

export function formatRagBlock(hits: RagHit[]): string {
  if (hits.length === 0) return "Nenhum trecho relevante encontrado pra essa pergunta.";
  return hits
    .map(
      (h, i) =>
        `### Trecho ${i + 1} (${h.kind}, ${(h.similarity * 100).toFixed(0)}% match)\n${h.content}`,
    )
    .join("\n\n");
}
