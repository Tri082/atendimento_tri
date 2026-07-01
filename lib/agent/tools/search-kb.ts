import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import { retrieveContext } from "@/lib/agent/rag/retrieve";
import type { ToolContext } from "./index";

export function makeSearchKbTool(ctx: ToolContext) {
  return tool({
    description:
      "Busca trechos relevantes na base de conhecimento da empresa (FAQ + documentos). Use ANTES de responder qualquer dúvida factual sobre produtos, prazos, preços, condições.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Pergunta ou termo de busca"),
    }),
    execute: async ({ query }) => {
      try {
        const hits = await retrieveContext(ctx.agentId, query, 5);
        if (hits.length === 0) {
          return { found: false, hits: [] };
        }
        return {
          found: true,
          hits: hits.map((h) => ({
            kind: h.kind,
            title: h.title.slice(0, 100),
            content: h.content.slice(0, 800),
            similarity: Math.round(h.similarity * 100),
          })),
        };
      } catch (err) {
        logError("tool.search_kb", err);
        return { error: "Não consegui buscar na base agora." };
      }
    },
  });
}
