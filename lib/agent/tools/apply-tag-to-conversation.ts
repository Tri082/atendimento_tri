import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

/**
 * Tool do agente IA que rotula a conversa atual com uma tag.
 *
 * Comportamento (regra C do spec de Tags):
 * 1. Busca tag no catálogo por nome (case-insensitive).
 * 2. Se existe E tem 'conversation' no escopo → aplica via conversation_tag_links
 *    com applied_by_kind = 'bot'. NÃO propaga pro contato vinculado (regra do spec).
 * 3. Se NÃO existe OU não tem escopo de conversa → grava em tag_suggestions
 *    via RPC. Admin vê em Settings → Tags e decide promover ou ignorar.
 *
 * O agente nunca cria tag no catálogo direto.
 */
export function makeApplyTagToConversationTool(ctx: ToolContext) {
  return tool({
    description:
      "Rotula a conversa atual com uma tag (ex: 'Cliente VIP', 'Bug Report'). " +
      "Se a tag já existe no catálogo da org, aplica direto. Se não existe, " +
      "registra como sugestão pra um admin revisar.",
    inputSchema: z.object({
      tag_name: z
        .string()
        .min(1)
        .max(40)
        .describe("Nome da tag (1-40 caracteres). Use Title Case."),
    }),
    execute: async ({ tag_name }) => {
      try {
        const trimmed = tag_name.trim();
        if (trimmed.length === 0) return { error: "Nome de tag vazio." };

        // Busca tag existente por nome (case-insensitive)
        const { data: existing } = await ctx.supabase
          .from("tags")
          .select("id, applies_to")
          .eq("organization_id", ctx.orgId)
          .ilike("name", trimmed)
          .maybeSingle();

        const appliesTo = (existing?.applies_to ?? []) as string[];
        const canApplyToConversation =
          !!existing && appliesTo.includes("conversation");

        if (canApplyToConversation && existing) {
          const { error: linkErr } = await ctx.supabase
            .from("conversation_tag_links")
            .upsert(
              {
                conversation_id: ctx.conversationId,
                tag_id: existing.id,
                organization_id: ctx.orgId,
                applied_by_kind: "bot",
                applied_by: null,
              },
              { onConflict: "conversation_id,tag_id", ignoreDuplicates: true },
            );
          if (linkErr) {
            logError("tool.apply_tag_to_conversation.link", linkErr);
            return { error: "Não consegui aplicar a tag agora." };
          }
          return { applied: true as const, tag_id: existing.id, name: trimmed };
        }

        // Caso: tag não existe OU não tem escopo de conversa → vira sugestão
        const { error: rpcErr } = await ctx.supabase.rpc("tag_suggestion_upsert", {
          p_org: ctx.orgId,
          p_name: trimmed,
          p_suggested_by: "agent",
          p_source_entity: "conversation",
          p_source_id: ctx.conversationId,
        });
        if (rpcErr) {
          logError("tool.apply_tag_to_conversation.suggest", rpcErr);
          return { error: "Não consegui registrar sugestão de tag." };
        }
        return {
          suggested: true as const,
          name: trimmed,
          reason: existing
            ? "Tag existe no catálogo mas não tem escopo de conversa. Admin precisa expandir o escopo."
            : "Tag não existe no catálogo. Admin pode promover em Settings → Tags.",
        };
      } catch (err) {
        logError("tool.apply_tag_to_conversation", err);
        return { error: "Erro inesperado ao aplicar tag." };
      }
    },
  });
}
