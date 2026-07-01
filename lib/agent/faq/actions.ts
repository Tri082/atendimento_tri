"use server";

import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { embedText } from "@/lib/agent/rag/embed";
import { createClient } from "@/lib/supabase/server";
import {
  createFaqInputSchema,
  deleteFaqInputSchema,
  updateFaqInputSchema,
  type CreateFaqInput,
  type DeleteFaqInput,
  type UpdateFaqInput,
} from "./schemas";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function assertAgentInOrg(supabase: Awaited<ReturnType<typeof createClient>>, agentId: string, orgId: string) {
  const { data } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return Boolean(data);
}

export async function createFaqItemAction(input: CreateFaqInput): Promise<Result<{ id: string }>> {
  const parsed = createFaqInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  if (!(await assertAgentInOrg(supabase, parsed.data.agentId, org.id))) {
    return { ok: false, error: "Agente não encontrado." };
  }

  const embedding = await embedText(`${parsed.data.question}\n\n${parsed.data.answer}`);
  const { data, error } = await supabase
    .from("agent_faq_items")
    .insert({
      organization_id: org.id,
      agent_id: parsed.data.agentId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      embedding: embedding as unknown as string,
    })
    .select("id")
    .single();
  if (error || !data) {
    logError("agent.faq.create", error);
    return { ok: false, error: "Não foi possível criar FAQ." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateFaqItemAction(input: UpdateFaqInput): Promise<Result> {
  const parsed = updateFaqInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  if (!(await assertAgentInOrg(supabase, parsed.data.agentId, org.id))) {
    return { ok: false, error: "Agente não encontrado." };
  }

  const embedding = await embedText(`${parsed.data.question}\n\n${parsed.data.answer}`);
  const { error } = await supabase
    .from("agent_faq_items")
    .update({
      question: parsed.data.question,
      answer: parsed.data.answer,
      embedding: embedding as unknown as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.faqId)
    .eq("agent_id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.faq.update", error);
    return { ok: false, error: "Não foi possível atualizar FAQ." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}

export async function deleteFaqItemAction(input: DeleteFaqInput): Promise<Result> {
  const parsed = deleteFaqInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_faq_items")
    .delete()
    .eq("id", parsed.data.faqId)
    .eq("agent_id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.faq.delete", error);
    return { ok: false, error: "Não foi possível remover FAQ." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}
