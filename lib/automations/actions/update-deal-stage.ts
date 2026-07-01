import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  deal_id: z.string().uuid(),
  new_stage: z.enum(["new", "qualified", "proposal_sent", "negotiation", "won", "lost"]),
});
type Input = z.infer<typeof inputSchema>;

export const updateDealStageAction: ActionDefinition<Input, { deal_id: string; new_stage: string }> = {
  id: "update_deal_stage",
  label: "Mover deal de estágio",
  description: "Move um deal pra outro estágio do pipeline.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation
    await assertOrgOwns(
      supabase,
      "deals",
      input.deal_id,
      ctx.orgId,
      "update_deal_stage",
    );
    const { error } = await supabase
      .from("deals")
      .update({ stage: input.new_stage })
      .eq("id", input.deal_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`update_deal_stage: ${error.message}`);
    return { deal_id: input.deal_id, new_stage: input.new_stage };
  },
  async simulate(input) {
    return { deal_id: input.deal_id, new_stage: input.new_stage };
  },
};
