import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const agentEscalatedTrigger: TriggerDefinition = {
  id: "agent.escalated",
  label: "Agente escalou pra humano",
  description: "Dispara quando o agente IA escala uma conversa pra um humano (handoff).",
  contextSchema: z.object({
    conversation: z.object({ id: z.string().uuid() }),
    contact: z.object({
      id: z.string().uuid().nullable(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
    }).nullable(),
    channel: z.object({ id: z.string().uuid(), type: z.string() }),
    reason: z.string().nullable(),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({}),
  variables: [
    "{{conversation.id}}", "{{contact.name}}", "{{contact.phone}}",
    "{{channel.type}}", "{{reason}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "conversation.id": { label: "ID da conversa" },
    "contact.name": { label: "Nome do contato", example: "João Silva" },
    "contact.phone": { label: "Telefone do contato", example: "+5511987654321" },
    "channel.type": { label: "Tipo do canal", example: "whatsapp_cloud" },
    reason: { label: "Motivo da escalação", example: "Cliente pediu humano" },
  },
  sampleContext: {
    conversation: { id: "00000000-0000-4000-8000-000000000001" },
    contact: { id: "00000000-0000-4000-8000-000000000005", name: "João", phone: "+5511987654321" },
    channel: { id: "00000000-0000-4000-8000-000000000002", type: "whatsapp_cloud" },
    reason: "Cota diária atingida",
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
