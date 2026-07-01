import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const removeTagFromConversationAction: ActionDefinition<Input, { removed: boolean }> = {
  id: "remove_tag_from_conversation",
  label: "Remover tag da conversa",
  description: "Remove uma tag específica de uma conversa.",
  category: "org",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(
      supabase,
      "conversations",
      input.conversation_id,
      ctx.orgId,
      "remove_tag_from_conversation",
    );
    const { error, count } = await supabase
      .from("conversation_tag_links")
      .delete({ count: "exact" })
      .eq("conversation_id", input.conversation_id)
      .eq("tag_id", input.tag_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`remove_tag_from_conversation: ${error.message}`);
    return { removed: (count ?? 0) > 0 };
  },
  async simulate() {
    return { removed: true };
  },
};
