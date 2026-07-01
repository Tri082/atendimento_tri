import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  company_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const removeTagFromCompanyAction: ActionDefinition<Input, { removed: boolean }> = {
  id: "remove_tag_from_company",
  label: "Remover tag da empresa",
  description: "Remove uma tag específica de uma empresa.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(
      supabase,
      "companies",
      input.company_id,
      ctx.orgId,
      "remove_tag_from_company",
    );
    const { error, count } = await supabase
      .from("company_tag_links")
      .delete({ count: "exact" })
      .eq("company_id", input.company_id)
      .eq("tag_id", input.tag_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`remove_tag_from_company: ${error.message}`);
    return { removed: (count ?? 0) > 0 };
  },
  async simulate() {
    return { removed: true };
  },
};
