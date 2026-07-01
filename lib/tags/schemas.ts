import { z } from "zod";

export const tagScopeSchema = z.enum(["conversation", "contact", "company", "deal"]);
export type TagScope = z.infer<typeof tagScopeSchema>;

export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida. Use o formato #rrggbb.");

export const tagNameSchema = z
  .string()
  .min(1, "Dá um nome pra tag.")
  .max(40, "Nome muito longo (máx 40 caracteres).");

export const createTagSchema = z.object({
  orgSlug: z.string().min(1),
  name: tagNameSchema,
  color: tagColorSchema,
  appliesTo: z
    .array(tagScopeSchema)
    .min(1, "Marca pelo menos um lugar onde a tag pode ser usada."),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  orgSlug: z.string().min(1),
  id: z.string().uuid(),
  name: tagNameSchema.optional(),
  color: tagColorSchema.optional(),
  appliesTo: z.array(tagScopeSchema).min(1).optional(),
});
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

export const deleteTagSchema = z.object({
  orgSlug: z.string().min(1),
  id: z.string().uuid(),
});
export type DeleteTagInput = z.infer<typeof deleteTagSchema>;

export const applyTagSchema = z.object({
  orgSlug: z.string().min(1),
  tagId: z.string().uuid(),
  entityId: z.string().uuid(),
  propagateToContact: z.boolean().optional(),
});
export type ApplyTagInput = z.infer<typeof applyTagSchema>;

export const removeTagSchema = z.object({
  orgSlug: z.string().min(1),
  tagId: z.string().uuid(),
  entityId: z.string().uuid(),
});
export type RemoveTagInput = z.infer<typeof removeTagSchema>;

export const promoteSuggestionSchema = z.object({
  orgSlug: z.string().min(1),
  suggestionId: z.string().uuid(),
  color: tagColorSchema,
  appliesTo: z.array(tagScopeSchema).min(1),
});
export type PromoteSuggestionInput = z.infer<typeof promoteSuggestionSchema>;

export const ignoreSuggestionSchema = z.object({
  orgSlug: z.string().min(1),
  suggestionId: z.string().uuid(),
});
export type IgnoreSuggestionInput = z.infer<typeof ignoreSuggestionSchema>;
