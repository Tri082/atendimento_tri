import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

export function makeCreateContactTool(ctx: ToolContext) {
  return tool({
    description:
      "Cria um contato novo no CRM. Use SE o cliente disse o nome dele e ainda não existe contato. Idempotente por telefone: se já existe contato com o mesmo phone na org, retorna o existente sem duplicar.",
    inputSchema: z.object({
      name: z.string().min(1).describe("Nome completo"),
      email: z.string().optional(),
      phone: z.string().optional().describe("Telefone do contato"),
      notes: z.string().optional(),
    }),
    execute: async ({ name, email, phone, notes }) => {
      try {
        // Idempotência por phone (se passado)
        if (phone) {
          const { data: existing } = await ctx.supabase
            .from("contacts")
            .select("id, name")
            .eq("organization_id", ctx.orgId)
            .eq("phone", phone)
            .maybeSingle();
          if (existing) {
            // Vincula à conversa também
            await ctx.supabase
              .from("conversations")
              .update({ contact_id: existing.id })
              .eq("id", ctx.conversationId);
            return { id: existing.id, created: false, name: existing.name };
          }
        }

        const { data, error } = await ctx.supabase
          .from("contacts")
          .insert({
            organization_id: ctx.orgId,
            name,
            email: email ?? null,
            phone: phone ?? null,
            notes: notes ?? null,
          })
          .select("id")
          .single();
        if (error || !data) {
          logError("tool.create_contact.insert", error);
          return { error: "Não consegui criar contato." };
        }

        // Vincula à conversa
        await ctx.supabase
          .from("conversations")
          .update({ contact_id: data.id })
          .eq("id", ctx.conversationId);

        return { id: data.id, created: true, name };
      } catch (err) {
        logError("tool.create_contact", err);
        return { error: "Não consegui criar contato." };
      }
    },
  });
}
