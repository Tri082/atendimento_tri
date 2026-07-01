"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember, requireOrgRole } from "@/lib/auth/guards";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/supabase";
import {
  type CreateTaskInput,
  createTaskSchema,
  type DeleteTaskInput,
  deleteTaskSchema,
  type UpdateTaskInput,
  updateTaskSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function createTaskAction(
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: org.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate ?? null,
      contact_id: parsed.data.contactId ?? null,
      company_id: parsed.data.companyId ?? null,
      deal_id: parsed.data.dealId ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("tasks.create", error);
    return { ok: false, error: "Erro ao criar tarefa. Tente novamente." };
  }

  if (parsed.data.contactId) {
    revalidatePath(`/app/${parsed.data.orgSlug}/contatos/${parsed.data.contactId}`);
  }
  if (parsed.data.companyId) {
    revalidatePath(`/app/${parsed.data.orgSlug}/empresas/${parsed.data.companyId}`);
  }
  if (parsed.data.dealId) {
    revalidatePath(`/app/${parsed.data.orgSlug}/deals/${parsed.data.dealId}`);
  }
  revalidatePath(`/app/${parsed.data.orgSlug}/tarefas`);
  return { ok: true, data: { id: data.id } };
}

export async function updateTaskAction(input: UpdateTaskInput): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const patch: TablesUpdate<"tasks"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;

  // Sub-H: precisamos do status anterior pra decidir se emit task.completed
  const { data: before } = await supabase
    .from("tasks")
    .select("status, title, assigned_to, contact_id, deal_id")
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Tarefa não encontrada" };

  const previousStatus = before.status;
  const willComplete =
    parsed.data.status === "done" && previousStatus !== "done";

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("tasks.update", error);
    return { ok: false, error: "Erro ao atualizar tarefa. Tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/tarefas`);
  revalidatePath(`/app/${parsed.data.orgSlug}/tarefas/${parsed.data.id}`);

  // Sub-H: emit task.completed (só quando muda pra done)
  if (willComplete) {
    const taskId = parsed.data.id;
    const orgId = org.id;
    const orgSlug = parsed.data.orgSlug;
    const title = before.title;
    const assigneeId = before.assigned_to;
    const contactId = before.contact_id;
    const dealId = before.deal_id;
    // Sub-H C-3: discriminador pra permitir re-conclusão da mesma task.
    // Sub-H Round-2 #13: coalesce por minuto — toggle done→pendente→done em < 60s
    // gera o mesmo eventId e a UNIQUE deduplica (idempotência intencional pra evitar
    // automação rodando 2x se aluno clica rápido no checkbox).
    const completedMinute = new Date().toISOString().slice(0, 16);
    emitAfter("task-completed", {
      orgId,
      triggerType: "task.completed",
      eventId: `${taskId}:${completedMinute}`,
      payload: {
        task: {
          id: taskId,
          title,
          assignee_id: assigneeId,
          contact_id: contactId,
          deal_id: dealId,
        },
        org: { id: orgId, name: "", slug: orgSlug },
      },
    });
  }

  return { ok: true };
}

export async function deleteTaskAction(input: DeleteTaskInput): Promise<ActionResult> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", org.id);

  if (error) {
    logError("tasks.delete", error);
    return { ok: false, error: "Erro ao excluir tarefa. Tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/tarefas`);
  return { ok: true };
}
