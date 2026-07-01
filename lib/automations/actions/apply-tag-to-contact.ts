import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  contact_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
type Input = z.infer<typeof inputSchema>;

export const applyTagToContactAction: ActionDefinition<Input, { applied: boolean }> = {
  id: "apply_tag_to_contact",
  label: "Aplicar tag em contato",
  description: "Aplica uma tag do catálogo num contato. A tag precisa ter escopo de contato.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    await assertOrgOwns(supabase, "contacts", input.contact_id, ctx.orgId, "apply_tag_to_contact");
    await assertOrgOwns(supabase, "tags", input.tag_id, ctx.orgId, "apply_tag_to_contact");
    const { error } = await supabase
      .from("contact_tag_links")
      .upsert(
        {
          contact_id: input.contact_id,
          tag_id: input.tag_id,
          organization_id: ctx.orgId,
          applied_by_kind: "automation",
          applied_by: null,
        },
        { onConflict: "contact_id,tag_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.message.includes("não pode ser aplicada em contact")) {
        throw new Error(
          `Tag ${input.tag_id} não tem escopo de contato. Ajuste em Settings → Tags.`,
        );
      }
      throw new Error(`apply_tag_to_contact: ${error.message}`);
    }
    return { applied: true };
  },
  async simulate() {
    return { applied: true };
  },
};
