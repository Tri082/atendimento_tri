import { z } from "zod";

export const createFaqInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
});

export const updateFaqInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  faqId: z.guid(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
});

export const deleteFaqInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  faqId: z.guid(),
});

export type CreateFaqInput = z.infer<typeof createFaqInputSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqInputSchema>;
export type DeleteFaqInput = z.infer<typeof deleteFaqInputSchema>;
