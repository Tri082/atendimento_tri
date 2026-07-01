import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  contact_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const removeTagFromContactAction: ActionDefinition<Input, { removed: boolean }> = {
  id: "remove_tag_from_contact",
  label: "Remover tag do contato",
  description: "Remove uma tag específica de um contato.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(
      supabase,
      "contacts",
      input.contact_id,
      ctx.orgId,
      "remove_tag_from_contact",
    );
    const { error, count } = await supabase
      .from("contact_tag_links")
      .delete({ count: "exact" })
      .eq("contact_id", input.contact_id)
      .eq("tag_id", input.tag_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`remove_tag_from_contact: ${error.message}`);
    return { removed: (count ?? 0) > 0 };
  },
  async simulate() {
    return { removed: true };
  },
};
