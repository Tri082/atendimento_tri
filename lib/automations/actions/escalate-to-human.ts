import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});
type Input = z.infer<typeof inputSchema>;

export const escalateToHumanAction: ActionDefinition<
  Input,
  { task_id: string }
> = {
  id: "escalate_to_human",
  label: "Escalar pra humano",
  description:
    "Pausa o agente IA e cria uma tarefa urgente pra alguém do time atender essa conversa.",
  category: "org",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation
    await assertOrgOwns(
      supabase,
      "conversations",
      input.conversation_id,
      ctx.orgId,
      "escalate_to_human",
    );
    const { error: pauseErr } = await supabase
      .from("conversations")
      .update({ agent_status: "paused_handoff" })
      .eq("id", input.conversation_id)
      .eq("organization_id", ctx.orgId);
    if (pauseErr) throw new Error(`escalate pause: ${pauseErr.message}`);
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        organization_id: ctx.orgId,
        title: "Atender conversa escalada",
        description: input.reason,
        priority: "high",
        status: "pending",
      })
      .select("id")
      .single();
    if (taskErr || !task) {
      throw new Error(`escalate task: ${taskErr?.message ?? "no row"}`);
    }
    return { task_id: task.id };
  },
  async simulate(_input) {
    return { task_id: "DRY-RUN-escalation-task" };
  },
};
