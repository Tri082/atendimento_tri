import { z } from "zod";

export const TONE_VALUES = ["formal", "casual", "amigavel"] as const;
export const PROVIDER_VALUES = ["anthropic", "openai"] as const;

/** Cria agente. Campos opcionais usam defaults da tabela. */
export const createAgentSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  tone: z.enum(TONE_VALUES),
  daily_token_cap: z.number().int().min(1000).max(10_000_000),
});

/** Atualiza agente — todos os campos opcionais; só atualiza o que vier. */
export const updateAgentSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  name: z.string().min(1).max(80).optional(),
  company_name: z.string().max(120).nullable().optional(),
  persona: z.string().max(2000).nullable().optional(),
  goal: z.string().max(2000).nullable().optional(),
  tone: z.enum(TONE_VALUES).optional(),
  never_do: z.string().max(2000).nullable().optional(),
  daily_token_cap: z.number().int().min(1000).max(10_000_000).optional(),
  llm_provider: z.enum(PROVIDER_VALUES).optional(),
  llm_model: z.string().min(1).max(120).optional(),
});

export const toggleAgentActiveSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  is_active: z.boolean(),
});

export const deleteAgentSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  agentId: z.guid(),
  /** Aluno digita o nome do agente pra confirmar. */
  confirmationName: z.string().min(1).max(80),
});

export const setChannelAgentSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  channelId: z.guid(),
  /** NULL desliga o agente do canal. */
  agentId: z.guid().nullable(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type ToggleAgentActiveInput = z.infer<typeof toggleAgentActiveSchema>;
export type DeleteAgentInput = z.infer<typeof deleteAgentSchema>;
export type SetChannelAgentInput = z.infer<typeof setChannelAgentSchema>;
