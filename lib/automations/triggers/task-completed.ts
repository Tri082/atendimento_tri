import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const taskCompletedTrigger: TriggerDefinition = {
  id: "task.completed",
  label: "Tarefa concluída",
  description: "Dispara quando uma tarefa é marcada como concluída.",
  contextSchema: z.object({
    task: z.object({
      id: z.string().uuid(),
      title: z.string(),
      assignee_id: z.string().uuid().nullable(),
      contact_id: z.string().uuid().nullable(),
      deal_id: z.string().uuid().nullable(),
    }),
    org: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  }),
  triggerConfigSchema: z.object({}),
  variables: ["{{task.id}}", "{{task.title}}", "{{org.name}}", "{{now.iso}}"],
  variableLabels: {
    "task.id": { label: "ID da tarefa" },
    "task.title": { label: "Título da tarefa", example: "Ligar pro cliente" },
  },
  sampleContext: {
    task: {
      id: "00000000-0000-4000-8000-000000000030",
      title: "Ligar pro João", assignee_id: null, contact_id: null, deal_id: null,
    },
    org: { id: "00000000-0000-4000-8000-000000000003", name: "Minha Empresa", slug: "minha-empresa" },
  },
};
