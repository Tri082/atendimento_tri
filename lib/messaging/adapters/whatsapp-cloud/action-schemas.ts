import { z } from "zod";

export const connectChannelInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  config: z.object({
    phoneNumberId: z.string().regex(/^\d+$/).min(10).max(20),
    wabaId: z.string().regex(/^\d+$/).min(10).max(20),
    accessToken: z.string().min(20).max(500),
    appSecret: z.string().min(20).max(200),
  }),
});

export const channelIdInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
});

export const testSendTemplateInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
  to: z.string().min(8).max(20),
  templateName: z.string().min(1).max(200),
  language: z.string().min(2).max(10),
  params: z.record(z.string(), z.string().max(500)),
});

export type ConnectChannelInput = z.infer<typeof connectChannelInputSchema>;
export type ChannelIdInput = z.infer<typeof channelIdInputSchema>;
export type TestSendTemplateInput = z.infer<typeof testSendTemplateInputSchema>;
