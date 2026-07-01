import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgMember, assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  /** Mapeia pra coluna `assigned_to` (user id) — nome no plano era `assignee_id`. */
  assigned_to: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  /** Dias a partir de agora até o vencimento. Mapeia pra coluna `due_date` (DATE). */
  due_in_days: z.number().int().min(0).max(365).optional().nullable(),
});
type Input = z.infer<typeof inputSchema>;

export const createTaskAction: ActionDefinition<Input, { task_id: string }> = {
  id: "create_task",
  label: "Criar tarefa",
  description: "Cria uma tarefa pra alguém do time.",
  category: "crm",
  inputSchema,
  async execute(input, ctx) {
    const supabase = createServiceClient();
    // Sub-H C-2: org isolation pra cada FK opcional
    if (input.contact_id) {
      await assertOrgOwns(
        supabase,
        "contacts",
        input.contact_id,
        ctx.orgId,
        "create_task",
      );
    }
    if (input.deal_id) {
      await assertOrgOwns(
        supabase,
        "deals",
        input.deal_id,
        ctx.orgId,
        "create_task",
      );
    }
    if (input.assigned_to) {
      // Sub-H C-1: assignee precisa ser membro da org
      await assertOrgMember(
        supabase,
        input.assigned_to,
        ctx.orgId,
        "create_task",
      );
    }
    // `tasks.due_date` é DATE (tipo string 'YYYY-MM-DD'), não timestamptz — slice(0,10).
    const dueDate = input.due_in_days != null
      ? new Date(Date.now() + input.due_in_days * 86_400_000).toISOString().slice(0, 10)
      : null;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        organization_id: ctx.orgId,
        title: input.title,
        description: input.description ?? null,
        assigned_to: input.assigned_to ?? null,
        contact_id: input.contact_id ?? null,
        deal_id: input.deal_id ?? null,
        priority: input.priority,
        status: "pending",
        due_date: dueDate,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`create_task: ${error?.message ?? "no row"}`);
    return { task_id: data.id };
  },
  async simulate(input) {
    return { task_id: `DRY-RUN-task-${input.title}` };
  },
};
