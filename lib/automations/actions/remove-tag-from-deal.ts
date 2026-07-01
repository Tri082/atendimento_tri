import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  deal_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const removeTagFromDealAction: ActionDefinition<Input, { removed: boolean }> = {
  id: "remove_tag_from_deal",
  label: "Remover tag do deal",
  description: "Remove uma tag específica de um deal.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(supabase, "deals", input.deal_id, ctx.orgId, "remove_tag_from_deal");
    const { error, count } = await supabase
      .from("deal_tag_links")
      .delete({ count: "exact" })
      .eq("deal_id", input.deal_id)
      .eq("tag_id", input.tag_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`remove_tag_from_deal: ${error.message}`);
    return { removed: (count ?? 0) > 0 };
  },
  async simulate() {
    return { removed: true };
  },
};
