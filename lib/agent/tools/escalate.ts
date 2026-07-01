import { randomUUID } from "node:crypto";
import { tool } from "ai";
import { z } from "zod";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

export function makeEscalateTool(ctx: ToolContext) {
  return tool({
    description:
      "Escalona pra humano: pausa o agente nessa conversa, cria task urgente, e retorna instrução pra você mandar uma mensagem de despedida ao cliente. Use quando: cliente pediu humano explicitamente, ou você não consegue ajudar com o que ele precisa.",
    inputSchema: z.object({
      reason: z.string().min(1).max(500).describe("Por que você está escalando"),
    }),
    execute: async ({ reason }) => {
      try {
        // 1. Pausa agente na conversa
        await ctx.supabase
          .from("conversations")
          .update({ agent_status: "paused_handoff" })
          .eq("id", ctx.conversationId)
          .eq("organization_id", ctx.orgId);

        // 2. Cria task high-priority
        await ctx.supabase.from("tasks").insert({
          organization_id: ctx.orgId,
          contact_id: ctx.contactId,
          title: `Atender conversa escalada: ${reason.slice(0, 80)}`,
          description: `Agente escalou. Razão completa: ${reason}`,
          priority: "high",
          status: "pending",
        });

        // Sub-H: emit agent.escalated
        // Sub-H H-4: randomUUID slice no dedupeId — se 2 escalações no mesmo ms (clock skew),
        // só timestamp pode colidir; uuid garante unicidade
        const escalatedAt = new Date().toISOString();
        const dedupeId = randomUUID().slice(0, 8);
        const orgId = ctx.orgId;
        const convId = ctx.conversationId;
        const contactId = ctx.contactId ?? null;
        const escalationReason = reason;

        // Sub-H Round-2 #18: busca channel real em vez de hardcoded ""
        // (vars {{channel.type}} agora vêm preenchidas em automações q escutam agent.escalated)
        const { data: convInfo } = await ctx.supabase
          .from("conversations")
          .select("channel_id, channel:channels(id, type)")
          .eq("id", convId)
          .eq("organization_id", orgId)
          .maybeSingle();
        const channelData = (convInfo?.channel ?? null) as {
          id: string;
          type: string;
        } | null;

        emitAfter("agent-escalated", {
          orgId,
          triggerType: "agent.escalated",
          eventId: `${convId}:${escalatedAt}:${dedupeId}`,
          payload: {
            conversation: { id: convId },
            contact: contactId
              ? { id: contactId, name: null, phone: null }
              : null,
            channel: channelData
              ? { id: channelData.id, type: channelData.type }
              : { id: "", type: "" },
            reason: escalationReason,
            org: { id: orgId, name: "", slug: "" },
          },
        });

        return {
          success: true,
          instruction:
            "Você acabou de escalar pro humano. Mande UMA mensagem curta e cordial avisando o cliente que um humano vai continuar com ele em breve. Não use tools novamente.",
        };
      } catch (err) {
        logError("tool.escalate", err);
        return { error: "Não consegui escalar agora." };
      }
    },
  });
}
