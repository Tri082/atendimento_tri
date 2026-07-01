import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  deal_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const applyTagToDealAction: ActionDefinition<Input, { applied: boolean }> = {
  id: "apply_tag_to_deal",
  label: "Aplicar tag em deal",
  description: "Aplica uma tag do catálogo num deal. A tag precisa ter escopo de deal.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(supabase, "deals", input.deal_id, ctx.orgId, "apply_tag_to_deal");
    await assertOrgOwns(supabase, "tags", input.tag_id, ctx.orgId, "apply_tag_to_deal");
    const { error } = await supabase
      .from("deal_tag_links")
      .upsert(
        {
          deal_id: input.deal_id,
          tag_id: input.tag_id,
          organization_id: ctx.orgId,
          applied_by_kind: "automation",
          applied_by: null,
        },
        { onConflict: "deal_id,tag_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.message.includes("não pode ser aplicada em deal")) {
        throw new Error(`Tag ${input.tag_id} não tem escopo de deal. Ajuste em Settings → Tags.`);
      }
      throw new Error(`apply_tag_to_deal: ${error.message}`);
    }
    return { applied: true };
  },
  async simulate() {
    return { applied: true };
  },
};
