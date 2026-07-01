import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const pauseAgentOnConversationAction: ActionDefinition<
  Input,
  { paused: true }
> = {
  id: "pause_agent_on_conversation",
  label: "Pausar agente IA na conversa",
  description:
    "Pausa o agente IA nessa conversa específica (não pausa o agente globalmente).",
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
      "pause_agent_on_conversation",
    );
    const { error } = await supabase
      .from("conversations")
      .update({ agent_status: "paused_handoff" })
      .eq("id", input.conversation_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`pause_agent: ${error.message}`);
    return { paused: true };
  },
  async simulate(_input) {
    return { paused: true };
  },
};
