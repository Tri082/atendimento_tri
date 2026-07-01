import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

export function makeFindContactTool(ctx: ToolContext) {
  return tool({
    description:
      "Busca contatos no CRM por nome ou email. Retorna até 5 matches.",
    inputSchema: z.object({
      name: z.string().optional().describe("Nome ou parte do nome"),
      email: z.string().optional().describe("Email exato ou parte"),
    }),
    execute: async ({ name, email }) => {
      if (!name && !email) return { contacts: [] };
      try {
        let query = ctx.supabase
          .from("contacts")
          .select("id, name, email, phone, company:companies(name)")
          .eq("organization_id", ctx.orgId)
          .limit(5);
        if (name) query = query.ilike("name", `%${name}%`);
        if (email) query = query.ilike("email", `%${email}%`);
        const { data } = await query;
        return {
          contacts: (data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            company_name:
              (c.company as unknown as { name: string } | null)?.name ?? null,
          })),
        };
      } catch (err) {
        logError("tool.find_contact", err);
        return { error: "Não consegui buscar contatos." };
      }
    },
  });
}
