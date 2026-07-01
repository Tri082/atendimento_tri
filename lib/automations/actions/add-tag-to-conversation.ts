import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const addTagToConversationAction: ActionDefinition<Input, { applied: boolean }> = {
  id: "add_tag_to_conversation",
  label: "Adicionar tag na conversa",
  description:
    "Aplica uma tag do catálogo numa conversa. A tag precisa existir no catálogo e ter escopo de conversa.",
  category: "org",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(
      supabase,
      "conversations",
      input.conversation_id,
      ctx.orgId,
      "add_tag_to_conversation",
    );
    await assertOrgOwns(supabase, "tags", input.tag_id, ctx.orgId, "add_tag_to_conversation");
    const { error } = await supabase
      .from("conversation_tag_links")
      .upsert(
        {
          conversation_id: input.conversation_id,
          tag_id: input.tag_id,
          organization_id: ctx.orgId,
          applied_by_kind: "automation",
          applied_by: null,
        },
        { onConflict: "conversation_id,tag_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.message.includes("não pode ser aplicada em conversation")) {
        throw new Error(
          `Tag ${input.tag_id} não tem escopo de conversa. Edite a tag em Settings → Tags e marque "Conversa".`,
        );
      }
      throw new Error(`add_tag_to_conversation: ${error.message}`);
    }
    return { applied: true };
  },
  async simulate() {
    return { applied: true };
  },
};
