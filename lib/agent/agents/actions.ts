"use server";

import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/supabase";
import {
  createAgentSchema,
  deleteAgentSchema,
  setChannelAgentSchema,
  toggleAgentActiveSchema,
  updateAgentSchema,
  type CreateAgentInput,
  type DeleteAgentInput,
  type SetChannelAgentInput,
  type ToggleAgentActiveInput,
  type UpdateAgentInput,
} from "./schemas";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function createAgentAction(input: CreateAgentInput): Promise<Result<{ agentId: string }>> {
  const parsed = createAgentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { user, org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      organization_id: org.id,
      name: parsed.data.name,
      tone: parsed.data.tone,
      daily_token_cap: parsed.data.daily_token_cap,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    logError("agent.create", error);
    if (error.code === "23505") return { ok: false, error: "Já existe um agente com esse nome." };
    return { ok: false, error: "Não foi possível criar o agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents`);
  return { ok: true, data: { agentId: data.id } };
}

export async function updateAgentAction(input: UpdateAgentInput): Promise<Result> {
  const parsed = updateAgentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { user, org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  const patch: TablesUpdate<"agents"> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.company_name !== undefined) patch.company_name = parsed.data.company_name;
  if (parsed.data.persona !== undefined) patch.persona = parsed.data.persona;
  if (parsed.data.goal !== undefined) patch.goal = parsed.data.goal;
  if (parsed.data.tone !== undefined) patch.tone = parsed.data.tone;
  if (parsed.data.never_do !== undefined) patch.never_do = parsed.data.never_do;
  if (parsed.data.daily_token_cap !== undefined) patch.daily_token_cap = parsed.data.daily_token_cap;
  if (parsed.data.llm_provider !== undefined) patch.llm_provider = parsed.data.llm_provider;
  if (parsed.data.llm_model !== undefined) patch.llm_model = parsed.data.llm_model;

  const { error } = await supabase
    .from("agents")
    .update(patch)
    .eq("id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.update", error);
    if (error.code === "23505") return { ok: false, error: "Já existe um agente com esse nome." };
    return { ok: false, error: "Não foi possível atualizar o agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}

export async function toggleAgentActiveAction(input: ToggleAgentActiveInput): Promise<Result> {
  const parsed = toggleAgentActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { user, org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({ is_active: parsed.data.is_active, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.toggle", error);
    return { ok: false, error: "Não foi possível alterar o estado do agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents/${parsed.data.agentId}`);
  return { ok: true };
}

export async function deleteAgentAction(input: DeleteAgentInput): Promise<Result> {
  const parsed = deleteAgentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();

  // Confirmação por nome
  const { data: agent } = await supabase
    .from("agents")
    .select("name")
    .eq("id", parsed.data.agentId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!agent) return { ok: false, error: "Agente não encontrado." };
  if (agent.name !== parsed.data.confirmationName) {
    return { ok: false, error: "Nome digitado não confere com o nome do agente." };
  }

  // CASCADE em agent_faq_items, agent_documents, agent_document_chunks, agent_runs, agent_usage_daily
  // channels.agent_id vira NULL via ON DELETE SET NULL
  const { error } = await supabase
    .from("agents")
    .delete()
    .eq("id", parsed.data.agentId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.delete", error);
    return { ok: false, error: "Não foi possível apagar o agente." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents`);
  return { ok: true };
}

export async function setChannelAgentAction(input: SetChannelAgentInput): Promise<Result> {
  const parsed = setChannelAgentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgRole({ orgSlug: parsed.data.orgSlug, roles: ["owner", "admin"] });
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update({ agent_id: parsed.data.agentId })
    .eq("id", parsed.data.channelId)
    .eq("organization_id", org.id);
  if (error) {
    logError("agent.set-channel", error);
    return { ok: false, error: "Não foi possível atualizar o canal." };
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels/${parsed.data.channelId}`);
  revalidatePath(`/app/${parsed.data.orgSlug}/settings/agents`);
  return { ok: true };
}
