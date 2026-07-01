import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  name: z.string().min(1).max(200),
  stage: z.enum(["new", "qualified", "proposal_sent", "negotiation", "won", "lost"]).default("new"),
  value: z.number().optional().nullable(),
  // ⚠️ company_id é NOT NULL em deals — obrigatório aqui.
  company_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
});
type Input = z.infer<typeof inputSchema>;
type Output = { deal_id: string };

export const createDealAction: ActionDefinition<Input, Output> = {
  id: "create_deal",
  label: "Criar deal",
  description: "Cria um deal num estágio do pipeline. Exige uma empresa (company_id).",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation
    await assertOrgOwns(
      supabase,
      "companies",
      input.company_id,
      ctx.orgId,
      "create_deal",
    );
    if (input.contact_id) {
      await assertOrgOwns(
        supabase,
        "contacts",
        input.contact_id,
        ctx.orgId,
        "create_deal",
      );
    }
    const { data, error } = await supabase
      .from("deals")
      .insert({
        organization_id: ctx.orgId,
        name: input.name,
        stage: input.stage,
        value: input.value ?? null,
        company_id: input.company_id,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`create_deal: ${error?.message ?? "no row"}`);
    if (input.contact_id) {
      await supabase.from("deal_contacts").insert({ deal_id: data.id, contact_id: input.contact_id });
    }
    return { deal_id: data.id };
  },
  async simulate(input) {
    return { deal_id: `DRY-RUN-deal-${input.name}` };
  },
};
