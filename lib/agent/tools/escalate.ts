import { randomUUID } from "node:crypto";
import { tool } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { processSendOutbound } from "@/lib/messaging/router";
import type { ToolContext } from "./index";

const HANDOFF_MESSAGE =
  "Só um momento, vou chamar alguém do nosso time pra continuar te ajudando! 🙂";

export function makeEscalateTool(ctx: ToolContext) {
  return tool({
    description:
      "Escalona pra humano: pausa o agente nessa conversa, avisa o cliente automaticamente e cria task urgente. Use quando: cliente pediu humano explicitamente, ou você não consegue ajudar com o que ele precisa.",
    inputSchema: z.object({
      reason: z.string().min(1).max(500).describe("Por que você está escalando"),
    }),
    execute: async ({ reason }) => {
      try {
        // 1. Pausa agente na conversa + marca que está aguardando humano.
        // handoff_requested_at é o sinal usado pelo inbox pra destacar essa
        // conversa (lista + banner) até um humano responder ou resolvê-la —
        // diferente de agent_status='paused_handoff' sozinho, que também
        // cobre o caso de um atendente já ter clicado "Assumir" manualmente.
        await ctx.supabase
          .from("conversations")
          .update({
            agent_status: "paused_handoff",
            handoff_requested_at: new Date().toISOString(),
          })
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

        // 3. Avisa o cliente diretamente (não depende do LLM decidir mandar
        // uma mensagem de despedida por conta própria — isso não era
        // garantido e podia deixar o cliente sem resposta nenhuma).
        const { data: handoffMsg, error: handoffMsgError } = await ctx.supabase
          .from("messages")
          .insert({
            organization_id: ctx.orgId,
            conversation_id: ctx.conversationId,
            direction: "outbound",
            sender_kind: "bot",
            body: HANDOFF_MESSAGE,
            status: "sending",
          })
          .select("id")
          .single();

        if (handoffMsgError || !handoffMsg) {
          logError("tool.escalate.handoff-message", handoffMsgError ?? new Error("insert failed"));
        } else {
          after(() => processSendOutbound(handoffMsg.id));
        }

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
            "Você acabou de escalar pro humano — a mensagem de aviso já foi enviada automaticamente ao cliente. NÃO mande mais nenhuma mensagem nem use tools novamente.",
        };
      } catch (err) {
        logError("tool.escalate", err);
        return { error: "Não consegui escalar agora." };
      }
    },
  });
}
