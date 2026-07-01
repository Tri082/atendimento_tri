"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrgMember } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  conversationId: z.guid(),
});

type Input = z.infer<typeof inputSchema>;
type Result = { ok: true } | { ok: false; error: string };

export async function pauseAgentForConversationAction(input: Input): Promise<Result> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ agent_status: "paused_handoff" })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.pause", error);
    return { ok: false, error: "Não foi possível pausar agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}

export async function resumeAgentForConversationAction(input: Input): Promise<Result> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ agent_status: "idle", agent_thinking_started_at: null })
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.resume", error);
    return { ok: false, error: "Não foi possível devolver pro agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true };
}
