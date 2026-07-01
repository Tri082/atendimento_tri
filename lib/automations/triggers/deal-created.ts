import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const dealCreatedTrigger: TriggerDefinition = {
  id: "deal.created",
  label: "Deal criado",
  description: "Dispara quando um deal novo é criado (manual ou via automação).",
  contextSchema: z.object({
    deal: z.object({
      id: z.string().uuid(),
      name: z.string(),
      stage: z.string(),
      value: z.number().nullable(),
      owner_id: z.string().uuid().nullable(),
      company_id: z.string().uuid().nullable(),
    }),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({
    only_stage: z.string().optional(),
  }),
  variables: [
    "{{deal.id}}", "{{deal.name}}", "{{deal.stage}}", "{{deal.value}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "deal.id": { label: "ID do deal" },
    "deal.name": { label: "Nome do deal", example: "Proposta João — Plano Pro" },
    "deal.stage": { label: "Estágio do deal", example: "new" },
    "deal.value": { label: "Valor do deal (R$)", example: "1500.00" },
  },
  sampleContext: {
    deal: {
      id: "00000000-0000-4000-8000-000000000020",
      name: "Novo Lead", stage: "new", value: null, owner_id: null, company_id: null,
    },
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
