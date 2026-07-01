import { z } from "zod";

const orgSlugSchema = z.string().min(1).max(80);

const mediaSchema = z.object({
  url: z.string().url(),
  mimeType: z.string().min(1).max(120),
});

export const sendMessageSchema = z
  .object({
    orgSlug: orgSlugSchema,
    conversationId: z.guid(),
    body: z.string().max(4096).optional(),
    media: z.array(mediaSchema).max(10).optional(),
    replyToMessageId: z.guid().optional(),
  })
  .refine((v) => Boolean(v.body && v.body.length > 0) || (v.media && v.media.length > 0), {
    message: "Mensagem precisa ter texto ou mídia",
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const sendTemplateSchema = z.object({
  orgSlug: orgSlugSchema,
  conversationId: z.guid(),
  templateName: z.string().min(1).max(80),
  language: z.string().min(2).max(10),
  params: z.record(z.string(), z.string().max(500)),
});

export type SendTemplateInput = z.infer<typeof sendTemplateSchema>;

export const channelTypeSchema = z.enum([
  "whatsapp_cloud",
  "telegram",
  "instagram_dm",
  "sms",
  "mock",
]);

export const connectChannelSchema = z.object({
  orgSlug: orgSlugSchema,
  type: channelTypeSchema,
  name: z.string().min(1).max(80),
  config: z.record(z.string(), z.unknown()),
});

export type ConnectChannelInput = z.infer<typeof connectChannelSchema>;
