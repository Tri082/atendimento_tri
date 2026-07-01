import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
});
type Input = z.infer<typeof inputSchema>;
type Output = { contact_id: string; existed: boolean };

export const createContactAction: ActionDefinition<Input, Output> = {
  id: "create_contact",
  label: "Criar contato",
  description: "Cria um contato novo. Se já existe (por telefone ou email), retorna o existente.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation pra FK opcional
    if (input.company_id) {
      await assertOrgOwns(
        supabase,
        "companies",
        input.company_id,
        ctx.orgId,
        "create_contact",
      );
    }
    // Idempotência: busca por phone OR email
    if (input.phone) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", ctx.orgId)
        .eq("phone", input.phone)
        .maybeSingle();
      if (existing) return { contact_id: existing.id, existed: true };
    }
    if (input.email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", ctx.orgId)
        .eq("email", input.email)
        .maybeSingle();
      if (existing) return { contact_id: existing.id, existed: true };
    }
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: ctx.orgId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        company_id: input.company_id ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`create_contact: ${error?.message ?? "no row"}`);
    return { contact_id: data.id, existed: false };
  },
  async simulate(input) {
    return { contact_id: `DRY-RUN-contact-${input.phone ?? input.email ?? input.name}`, existed: false };
  },
};
