import { z } from "zod";

export const whatsappCloudConfigSchema = z.object({
  phoneNumberId: z.string().regex(/^\d+$/, "phoneNumberId deve conter só dígitos").min(10).max(20),
  wabaId: z.string().regex(/^\d+$/, "wabaId deve conter só dígitos").min(10).max(20),
  accessToken: z.string().min(20, "accessToken muito curto").max(500),
  appSecret: z.string().min(20, "appSecret muito curto").max(200),
  verifyToken: z.guid(),
  apiVersion: z.string().min(2).max(10).default("v22.0"),
});

export type WhatsappCloudConfig = z.infer<typeof whatsappCloudConfigSchema>;
