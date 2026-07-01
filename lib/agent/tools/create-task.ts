import { tool } from "ai";
import { z } from "zod";
import { logError } from "@/lib/logger";
import type { ToolContext } from "./index";

function computeDueDate(dueIn?: string): string | null {
  if (!dueIn) return null;
  const today = new Date();
  if (dueIn === "today") return today.toISOString().slice(0, 10);
  if (dueIn === "tomorrow") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().slice(0, 10);
  }
  if (dueIn === "next_week") {
    today.setDate(today.getDate() + 7);
    return today.toISOString().slice(0, 10);
  }
  return null;
}

export function makeCreateTaskTool(ctx: ToolContext) {
  return tool({
    description:
      "Cria uma tarefa pra alguém do time atender offline. Use quando você prometeu algo que precisa de humano (ex: ligação, orçamento manual, envio de doc).",
    inputSchema: z.object({
      title: z.string().min(1).describe("Título curto da tarefa"),
      description: z.string().optional(),
      dueIn: z.enum(["today", "tomorrow", "next_week"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }),
    execute: async ({ title, description, dueIn, priority }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("tasks")
          .insert({
            organization_id: ctx.orgId,
            contact_id: ctx.contactId,
            title,
            description: description ?? null,
            due_date: computeDueDate(dueIn),
            priority: priority ?? "medium",
            status: "pending",
          })
          .select("id")
          .single();
        if (error || !data) {
          logError("tool.create_task.insert", error);
          return { error: "Não consegui criar tarefa." };
        }
        return { id: data.id, title };
      } catch (err) {
        logError("tool.create_task", err);
        return { error: "Não consegui criar tarefa." };
      }
    },
  });
}
