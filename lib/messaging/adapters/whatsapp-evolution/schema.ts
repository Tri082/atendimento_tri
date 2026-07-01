import { z } from "zod";

export const evolutionConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(10),
  instanceName: z.string().min(1).max(80),
  webhookSecret: z.string().min(16),
  connectedNumber: z.string().optional().nullable(),
});

export type EvolutionConfig = z.infer<typeof evolutionConfigSchema>;
