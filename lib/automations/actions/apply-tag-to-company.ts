import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  company_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const applyTagToCompanyAction: ActionDefinition<Input, { applied: boolean }> = {
  id: "apply_tag_to_company",
  label: "Aplicar tag em empresa",
  description: "Aplica uma tag do catálogo numa empresa. A tag precisa ter escopo de empresa.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(supabase, "companies", input.company_id, ctx.orgId, "apply_tag_to_company");
    await assertOrgOwns(supabase, "tags", input.tag_id, ctx.orgId, "apply_tag_to_company");
    const { error } = await supabase
      .from("company_tag_links")
      .upsert(
        {
          company_id: input.company_id,
          tag_id: input.tag_id,
          organization_id: ctx.orgId,
          applied_by_kind: "automation",
          applied_by: null,
        },
        { onConflict: "company_id,tag_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.message.includes("não pode ser aplicada em company")) {
        throw new Error(
          `Tag ${input.tag_id} não tem escopo de empresa. Ajuste em Settings → Tags.`,
        );
      }
      throw new Error(`apply_tag_to_company: ${error.message}`);
    }
    return { applied: true };
  },
  async simulate() {
    return { applied: true };
  },
};
