import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  contact_id: z.string().uuid(),
  name: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  // Sub-H Round-2 #4: permite vincular contato a empresa via automação
  company_id: z.string().uuid().optional().nullable(),
});
type Input = z.infer<typeof inputSchema>;
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

export const updateContactAction: ActionDefinition<Input, { contact_id: string }> = {
  id: "update_contact",
  label: "Atualizar contato",
  description: "Atualiza campos de um contato existente.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation
    await assertOrgOwns(
      supabase,
      "contacts",
      input.contact_id,
      ctx.orgId,
      "update_contact",
    );
    // Sub-H Round-2 #4: valida que company_id (se passado) também pertence à org
    if (input.company_id) {
      await assertOrgOwns(
        supabase,
        "companies",
        input.company_id,
        ctx.orgId,
        "update_contact",
      );
    }
    const patch: ContactUpdate = {};
    // Sub-H Round-2 #9: ignora strings vazias em TODOS os campos string (não só name).
    // Templating com path inexistente vira "" — sem skip, sobrescreve bom valor com lixo.
    if (input.name !== undefined && input.name !== "") patch.name = input.name;
    if (input.email !== undefined && input.email !== "") patch.email = input.email;
    if (input.phone !== undefined && input.phone !== "") patch.phone = input.phone;
    // company_id: null e UUID são valores legítimos (desvincular vs vincular)
    if (input.company_id !== undefined) patch.company_id = input.company_id;
    const { error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", input.contact_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`update_contact: ${error.message}`);
    return { contact_id: input.contact_id };
  },
  async simulate(input) {
    return { contact_id: input.contact_id };
  },
};
