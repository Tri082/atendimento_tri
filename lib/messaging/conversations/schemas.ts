import { z } from "zod";

const orgSlug = z.string().min(1).max(80);

export const assignConvInputSchema = z.object({
  orgSlug,
  conversationId: z.guid(),
  userId: z.guid().nullable(),
});

export const resolveConvInputSchema = z.object({
  orgSlug,
  conversationId: z.guid(),
  resolved: z.boolean(),
});

export const markReadInputSchema = z.object({
  orgSlug,
  conversationId: z.guid(),
});

export const retryMessageInputSchema = z.object({
  orgSlug,
  messageId: z.guid(),
});

export const uploadMediaInputSchema = z.object({
  orgSlug,
  conversationId: z.guid(),
  fileBase64: z.string().min(1),
  mimeType: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
});

export const promoteContactInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("link"),
    orgSlug,
    conversationId: z.guid(),
    contactId: z.guid(),
  }),
  z.object({
    mode: z.literal("create"),
    orgSlug,
    conversationId: z.guid(),
    name: z.string().min(1).max(120),
    email: z.string().max(200).optional(),
    phone: z.string().max(40).optional(),
    companyId: z.guid().nullable().optional(),
  }),
]);

export type AssignConvInput = z.infer<typeof assignConvInputSchema>;
export type ResolveConvInput = z.infer<typeof resolveConvInputSchema>;
export type MarkReadInput = z.infer<typeof markReadInputSchema>;
export type RetryMessageInput = z.infer<typeof retryMessageInputSchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaInputSchema>;
export type PromoteContactInput = z.infer<typeof promoteContactInputSchema>;
