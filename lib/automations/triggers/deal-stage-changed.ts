import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const dealStageChangedTrigger: TriggerDefinition = {
  id: "deal.stage_changed",
  label: "Deal mudou de estágio",
  description: "Dispara quando um deal é movido de um estágio pra outro do pipeline.",
  contextSchema: z.object({
    deal: z.object({
      id: z.string().uuid(),
      name: z.string(),
      value: z.number().nullable(),
      previous_stage: z.string(),
      new_stage: z.string(),
      owner_id: z.string().uuid().nullable(),
    }),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({
    only_new_stage: z.string().optional(),
    only_from_stage: z.string().optional(),
  }),
  variables: [
    "{{deal.id}}", "{{deal.name}}", "{{deal.value}}",
    "{{deal.previous_stage}}", "{{deal.new_stage}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "deal.id": { label: "ID do deal" },
    "deal.name": { label: "Nome do deal", example: "Proposta João" },
    "deal.value": { label: "Valor do deal (R$)", example: "1500.00" },
    "deal.previous_stage": { label: "Estágio anterior", example: "qualified" },
    "deal.new_stage": { label: "Novo estágio", example: "proposal_sent" },
  },
  sampleContext: {
    deal: {
      id: "00000000-0000-4000-8000-000000000020",
      name: "Proposta SaaS Pro", value: 5000,
      previous_stage: "qualified", new_stage: "proposal_sent", owner_id: null,
    },
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
