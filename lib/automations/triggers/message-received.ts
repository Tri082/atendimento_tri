import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const messageReceivedTrigger: TriggerDefinition = {
  id: "message.received",
  label: "Mensagem recebida",
  description: "Dispara a cada mensagem inbound — atenção a loops, idempotente por message_id.",
  contextSchema: z.object({
    message: z.object({
      id: z.string().uuid(),
      body: z.string().nullable(),
      media_type: z.string().nullable(),
    }),
    conversation: z.object({ id: z.string().uuid() }),
    channel: z.object({ id: z.string().uuid(), type: z.string(), name: z.string() }),
    contact: z.object({
      id: z.string().uuid().nullable(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
    }).nullable(),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({
    channel_type_in: z.array(z.string()).optional(),
    body_contains: z.string().optional(),
  }),
  variables: [
    "{{message.body}}", "{{message.media_type}}",
    "{{conversation.id}}", "{{channel.type}}",
    "{{contact.name}}", "{{contact.phone}}",
    "{{org.name}}", "{{now.iso}}",
  ],
  variableLabels: {
    "message.body": {
      label: "Texto da mensagem",
      example: "Olá, quero saber mais",
    },
    "message.media_type": {
      label: "Tipo de mídia (se houver)",
      example: "image",
    },
    "conversation.id": { label: "ID da conversa" },
    "channel.type": { label: "Tipo do canal", example: "whatsapp_cloud" },
    "contact.name": { label: "Nome do contato", example: "João Silva" },
    "contact.phone": { label: "Telefone do contato", example: "+5511987654321" },
  },
  sampleContext: {
    message: { id: "00000000-0000-4000-8000-000000000010", body: "Olá, gostaria de saber mais", media_type: null },
    conversation: { id: "00000000-0000-4000-8000-000000000001" },
    channel: { id: "00000000-0000-4000-8000-000000000002", type: "whatsapp_cloud", name: "WhatsApp Comercial" },
    contact: { id: "00000000-0000-4000-8000-000000000005", name: "João", phone: "+5511987654321" },
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
