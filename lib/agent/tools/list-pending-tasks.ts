import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

export function makeListPendingTasksTool(ctx: ToolContext) {
  return tool({
    description:
      "Lista tarefas pendentes (não-done) de um contato. Use depois de identificar o contato.",
    inputSchema: z.object({
      contactId: z.string().describe("ID do contato no CRM"),
    }),
    execute: async ({ contactId }) => {
      try {
        const { data } = await ctx.supabase
          .from("tasks")
          .select("id, title, status, due_date, priority")
          .eq("organization_id", ctx.orgId)
          .eq("contact_id", contactId)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(10);
        return { tasks: data ?? [] };
      } catch (err) {
        logError("tool.list_pending_tasks", err);
        return { error: "Não consegui buscar tarefas." };
      }
    },
  });
}
