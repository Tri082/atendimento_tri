import { z } from "zod";

const optionalEmail = z
  .string()
  .max(200, "E-mail muito longo")
  .refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido")
  .optional();

const optionalPhone = z.string().max(40, "Telefone muito longo").optional();
const optionalTitle = z.string().max(120, "Cargo muito longo").optional();
const optionalNotes = z.string().max(5000, "Anotações muito longas").optional();
const optionalCompanyId = z.guid().nullable().optional();

export const createContactSchema = z.object({
  orgSlug: z.string(),
  name: z.string().min(1, "Nome obrigatório").max(120, "Nome muito longo"),
  email: optionalEmail,
  phone: optionalPhone,
  title: optionalTitle,
  companyId: optionalCompanyId,
  notes: optionalNotes,
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
  name: z.string().min(1).max(120).optional(),
  email: optionalEmail,
  phone: optionalPhone,
  title: optionalTitle,
  companyId: optionalCompanyId,
  notes: optionalNotes,
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const deleteContactSchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
});
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;
