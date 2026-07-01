import { z } from "zod";

export const createInvitationSchema = z.object({
  orgSlug: z.string(),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member"]),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(32),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
