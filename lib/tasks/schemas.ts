import { z } from "zod";

export const taskStatusEnum = z.enum(["pending", "in_progress", "done"]);
export const taskPriorityEnum = z.enum(["low", "medium", "high"]);

export const createTaskSchema = z.object({
  orgSlug: z.string(),
  title: z.string().min(2, "Título muito curto").max(120, "Título muito longo"),
  description: z.string().max(1000).optional(),
  priority: taskPriorityEnum,
  dueDate: z.string().nullable().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  orgSlug: z.string(),
  id: z.string().uuid(),
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const deleteTaskSchema = z.object({
  orgSlug: z.string(),
  id: z.string().uuid(),
});
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
