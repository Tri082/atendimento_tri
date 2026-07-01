import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Nome muito curto").max(80, "Nome muito longo"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
