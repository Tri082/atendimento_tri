import { z } from "zod";

export const changeRoleSchema = z.object({
  orgSlug: z.string(),
  membershipId: z.string().uuid(),
  newRole: z.enum(["admin", "member"]),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const removeMemberSchema = z.object({
  orgSlug: z.string(),
  membershipId: z.string().uuid(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const transferOwnershipSchema = z.object({
  orgSlug: z.string(),
  targetUserId: z.string().uuid(),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
