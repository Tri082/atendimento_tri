import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const contactCreatedTrigger: TriggerDefinition = {
  id: "contact.created",
  label: "Contato criado",
  description: "Dispara quando um contato novo é cadastrado (UI ou via automação).",
  contextSchema: z.object({
    contact: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      company_id: z.string().uuid().nullable(),
    }),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({
    only_with_email: z.boolean().optional(),
  }),
  variables: [
    "{{contact.id}}", "{{contact.name}}", "{{contact.email}}", "{{contact.phone}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "contact.id": { label: "ID do contato" },
    "contact.name": { label: "Nome do contato", example: "João Silva" },
    "contact.email": { label: "Email do contato", example: "joao@exemplo.com" },
    "contact.phone": { label: "Telefone do contato", example: "+5511987654321" },
  },
  sampleContext: {
    contact: {
      id: "00000000-0000-4000-8000-000000000005",
      name: "João Silva", email: "joao@example.com", phone: "+5511987654321", company_id: null,
    },
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
