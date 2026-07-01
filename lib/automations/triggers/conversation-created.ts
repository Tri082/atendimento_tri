import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const conversationCreatedTrigger: TriggerDefinition = {
  id: "conversation.created",
  label: "Nova conversa criada",
  description: "Dispara quando uma conversa nova aparece na inbox (primeira mensagem inbound).",
  contextSchema: z.object({
    conversation: z.object({
      id: z.string().uuid(),
      external_thread_id: z.string(),
      display_name: z.string().nullable().optional(),
    }),
    channel: z.object({
      id: z.string().uuid(),
      type: z.string(),
      name: z.string(),
    }),
    contact: z.object({
      id: z.string().uuid().nullable(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }).nullable(),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({
    channel_type_in: z.array(z.string()).optional(),
  }),
  variables: [
    "{{conversation.id}}", "{{conversation.external_thread_id}}", "{{conversation.display_name}}",
    "{{channel.type}}", "{{channel.name}}",
    "{{contact.name}}", "{{contact.phone}}", "{{contact.email}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "conversation.id": { label: "ID da conversa" },
    "conversation.external_thread_id": {
      label: "Telefone do contato (WhatsApp)",
      example: "+5511987654321",
    },
    "conversation.display_name": {
      label: "Nome do contato no WhatsApp (pushName)",
      example: "Mateus Castioni",
    },
    "channel.type": { label: "Tipo do canal", example: "whatsapp_cloud" },
    "channel.name": { label: "Nome do canal", example: "WhatsApp Comercial" },
    "contact.name": { label: "Nome do contato", example: "João Silva" },
    "contact.phone": { label: "Telefone do contato", example: "+5511987654321" },
    "contact.email": { label: "Email do contato", example: "joao@exemplo.com" },
  },
  sampleContext: {
    conversation: {
      id: "00000000-0000-4000-8000-000000000001",
      external_thread_id: "+5511987654321",
      display_name: "Mateus Castioni",
    },
    channel: { id: "00000000-0000-4000-8000-000000000002", type: "whatsapp_cloud", name: "WhatsApp Comercial" },
    contact: null,
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
