import { z } from "zod";

export const syncTemplatesInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
});

export type SyncTemplatesInput = z.infer<typeof syncTemplatesInputSchema>;
