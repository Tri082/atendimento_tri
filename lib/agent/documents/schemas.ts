import { z } from "zod";

export const uploadDocumentInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  filename: z.string().min(1).max(255),
  fileBase64: z.string().min(1),
  mimeType: z.string().min(1).max(120),
});

export const deleteDocumentInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  documentId: z.guid(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;
export type DeleteDocumentInput = z.infer<typeof deleteDocumentInputSchema>;

export const reprocessDocumentInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  documentId: z.guid(),
});

export type ReprocessDocumentInput = z.infer<typeof reprocessDocumentInputSchema>;
