import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const createTagInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  name: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR, "Cor deve ser #RRGGBB"),
});

export const updateTagInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  tagId: z.string().guid(),
  name: z.string().min(1).max(40).optional(),
  color: z.string().regex(HEX_COLOR, "Cor deve ser #RRGGBB").optional(),
}).refine((v) => v.name !== undefined || v.color !== undefined, {
  message: "Forneça name ou color",
});

export const tagIdInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  tagId: z.string().guid(),
});

export const convTagInputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  conversationId: z.string().guid(),
  tagId: z.string().guid(),
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;
export type TagIdInput = z.infer<typeof tagIdInputSchema>;
export type ConvTagInput = z.infer<typeof convTagInputSchema>;
