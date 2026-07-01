import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  deal_id: z.string().uuid(),
  name: z.string().optional(),
  value: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});
type Input = z.infer<typeof inputSchema>;
type DealUpdate = Database["public"]["Tables"]["deals"]["Update"];

export const updateDealFieldsAction: ActionDefinition<Input, { deal_id: string }> = {
  id: "update_deal_fields",
  label: "Atualizar campos do deal",
  description: "Atualiza nome, valor ou notas de um deal.",
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
      "update_deal_fields",
    );
    const patch: DealUpdate = {};
    // Sub-H Round-2 #9: ignora strings vazias em name/notes — templating com path
    // inexistente vira "". `value` é number — null intencional é OK, não filtra.
    if (input.name !== undefined && input.name !== "") patch.name = input.name;
    if (input.value !== undefined) patch.value = input.value;
    if (input.notes !== undefined && input.notes !== "") patch.notes = input.notes;
    const { error } = await supabase
      .from("deals")
      .update(patch)
      .eq("id", input.deal_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`update_deal_fields: ${error.message}`);
    return { deal_id: input.deal_id };
  },
  async simulate(input) {
    return { deal_id: input.deal_id };
  },
};
