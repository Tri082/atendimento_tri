import { z } from "zod";

export const dealStageEnum = z.enum([
  "new",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);

const optionalNotes = z.string().max(5000, "Anotações muito longas").optional();
const optionalDate = z.string().nullable().optional();
const optionalValue = z.number().nonnegative("Valor inválido").nullable().optional();

export const createDealSchema = z.object({
  orgSlug: z.string(),
  companyId: z.guid(),
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  stage: dealStageEnum.optional(),
  value: optionalValue,
  expectedCloseDate: optionalDate,
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
  name: z.string().min(1).max(200).optional(),
  value: optionalValue,
  expectedCloseDate: optionalDate,
  lostReason: z.string().max(1000, "Motivo muito longo").nullable().optional(),
  notes: optionalNotes,
});
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const moveDealStageSchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
  stage: dealStageEnum,
});
export type MoveDealStageInput = z.infer<typeof moveDealStageSchema>;

export const deleteDealSchema = z.object({
  orgSlug: z.string(),
  id: z.guid(),
});
export type DeleteDealInput = z.infer<typeof deleteDealSchema>;

export const linkDealContactSchema = z.object({
  orgSlug: z.string(),
  dealId: z.guid(),
  contactId: z.guid(),
});
export type LinkDealContactInput = z.infer<typeof linkDealContactSchema>;
