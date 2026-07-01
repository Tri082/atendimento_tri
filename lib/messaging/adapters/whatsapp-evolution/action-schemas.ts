import { z } from "zod";

export const connectEvolutionInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  baseUrl: z.string().url(),
  apiKey: z.string().min(10).max(500),
  instanceName: z.string().min(1).max(80),
  displayName: z.string().min(1).max(120),
});

export const disconnectEvolutionInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
});

export const reverifyEvolutionInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
});

export const testSendEvolutionInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
  to: z.string().min(8).max(20),
  body: z.string().min(1).max(4096),
});

export type ConnectEvolutionInput = z.infer<typeof connectEvolutionInputSchema>;
export type DisconnectEvolutionInput = z.infer<typeof disconnectEvolutionInputSchema>;
export type ReverifyEvolutionInput = z.infer<typeof reverifyEvolutionInputSchema>;
export type TestSendEvolutionInput = z.infer<typeof testSendEvolutionInputSchema>;
