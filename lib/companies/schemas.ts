import { z } from "zod";

const optionalNotes = z.string().max(5000, "Anotações muito longas").optional();

export const createCompanySchema = z.object({
  orgSlug: z.string(),
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  notes: optionalNotes,
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
  name: z.string().min(1).max(200).optional(),
  notes: optionalNotes,
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const deleteCompanySchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
});
export type DeleteCompanyInput = z.infer<typeof deleteCompanySchema>;
