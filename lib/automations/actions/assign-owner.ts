import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";
import type { ActionDefinition } from "../schemas";
import { assertOrgMember, assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  // MVP: só conversation. contacts/deals não têm owner_id editável
  // (created_by é congelado via trigger freeze_org_and_creator).
  target: z.literal("conversation"),
  target_id: z.string().uuid(),
  assignee: z.union([z.literal("round_robin"), z.string().uuid()]),
});
type Input = z.infer<typeof inputSchema>;

export const assignOwnerAction: ActionDefinition<Input, { assigned_to: string }> = {
  id: "assign_owner",
  label: "Atribuir responsável",
  description:
    "Atribui um membro como responsável por uma conversa. Use 'round_robin' pra sortear entre owner/admin da org.",
  category: "org",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: valida que a conversa pertence à org antes de qualquer escrita
    await assertOrgOwns(
      supabase,
      "conversations",
      input.target_id,
      ctx.orgId,
      "assign_owner",
    );
    let assigneeId: string = input.assignee;
    if (assigneeId === "round_robin") {
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("organization_id", ctx.orgId)
        .in(
          "role",
          ["owner", "admin"] as Database["public"]["Enums"]["org_role"][],
        );
      if (!members || members.length === 0) {
        throw new Error("assign_owner: nenhum admin/owner na org");
      }
      const picked = members[Math.floor(Math.random() * members.length)];
      if (!picked) throw new Error("assign_owner: random pick falhou");
      assigneeId = picked.user_id;
    } else {
      // Sub-H C-1: defesa em profundidade — UUID literal precisa ser membro da org
      await assertOrgMember(supabase, assigneeId, ctx.orgId, "assign_owner");
    }
    const { error } = await supabase
      .from("conversations")
      .update({ assignee_id: assigneeId })
      .eq("id", input.target_id)
      .eq("organization_id", ctx.orgId);
    if (error) throw new Error(`assign_owner: ${error.message}`);
    return { assigned_to: assigneeId };
  },
  async simulate(input) {
    return {
      assigned_to:
        input.assignee === "round_robin"
          ? "DRY-RUN-random-member"
          : input.assignee,
    };
  },
};
