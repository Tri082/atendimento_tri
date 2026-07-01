import { z } from "zod";
import { AUTOMATION_LIMITS } from "./limits";

// ============================================================
// Interfaces de definição (registry)
// ============================================================

export interface TriggerDefinition {
  id: string;
  label: string;
  description: string;
  contextSchema: z.ZodSchema;
  triggerConfigSchema: z.ZodSchema;
  /** Lista de paths `{{var}}` disponíveis pra templating (documentação) */
  variables: string[];
  /**
   * Labels amigáveis pra exibição na UI. Chave é o path SEM `{{}}` (ex.: "contact.name"),
   * valor é `{ label: "Nome do contato", example: "João Silva" }`. UI mostra label + example
   * em vez do path técnico.
   */
  variableLabels?: Record<string, { label: string; example?: string }>;
  /** Payload sintético usado em dry-run e na renderização do diagrama */
  sampleContext: Record<string, unknown>;
}

export interface ActionContext {
  /** Org dona da run (RLS / service client) */
  orgId: string;
  /** Recursion depth atual (incrementado quando action dispara nova automação) */
  depth: number;
  /** ID da run (pra logs e re-dispatch) */
  runId: string;
}

export interface ActionDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  label: string;
  description: string;
  category: "crm" | "messaging" | "org" | "external";
  inputSchema: z.ZodSchema<TInput>;
  execute: (input: TInput, ctx: ActionContext) => Promise<TOutput>;
  simulate: (input: TInput) => Promise<TOutput>;
}

// ============================================================
// Zod schemas (validação de automation no DB / Server Action)
// ============================================================

export const conditionOpSchema = z.enum([
  "eq", "ne", "gt", "gte", "lt", "lte",
  "contains", "not_contains",
  "in", "not_in",
  "is_empty", "is_not_empty",
  "has_tag", "lacks_tag",
]);
export type ConditionOp = z.infer<typeof conditionOpSchema>;

export const conditionSchema = z.object({
  field: z.string()
    .min(1, "Campo da condição não pode ser vazio.")
    .max(200, "Caminho do campo muito longo."),
  op: conditionOpSchema,
  value: z.unknown().optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

export const automationActionSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  on_error: z.enum(["stop", "continue"]),
});
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const automationStatusSchema = z.enum(["draft", "active", "paused"]);
export type AutomationStatus = z.infer<typeof automationStatusSchema>;

export const automationSchema = z.object({
  name: z.string()
    .min(1, "Coloca um nome pra automação.")
    .max(120, "Nome muito longo (máx 120 caracteres)."),
  description: z.string()
    .max(500, "Descrição muito longa (máx 500 caracteres).")
    .optional()
    .nullable(),
  trigger_type: z.string().min(1, "Escolha um evento que dispara a automação."),
  trigger_config: z.record(z.string(), z.unknown()),
  conditions: z.array(conditionSchema).max(
    AUTOMATION_LIMITS.MAX_CONDITIONS_PER_AUTOMATION,
    `Máximo de ${AUTOMATION_LIMITS.MAX_CONDITIONS_PER_AUTOMATION} condições por automação. Se precisar de mais filtros, crie outra automação com o mesmo trigger.`,
  ),
  actions: z.array(automationActionSchema)
    .min(1, "Adiciona pelo menos uma ação.")
    .max(
      AUTOMATION_LIMITS.MAX_ACTIONS_PER_AUTOMATION,
      `Máximo de ${AUTOMATION_LIMITS.MAX_ACTIONS_PER_AUTOMATION} ações por automação. Considera quebrar em duas automações menores pra ficar mais fácil de manter.`,
    ),
  status: automationStatusSchema,
});
export type AutomationInput = z.infer<typeof automationSchema>;

// ============================================================
// Trigger payload (o que vai pro context)
// ============================================================

export const triggerMetaSchema = z.object({
  /** dry-run flag — engine usa simulate() em vez de execute() */
  dry_run: z.boolean().optional().default(false),
  /** depth da cadeia de automações (0 = emitter externo) */
  depth: z.number().int().min(0).default(0),
});
export type TriggerMeta = z.infer<typeof triggerMetaSchema>;

export const triggerPayloadSchema = z.object({
  _meta: triggerMetaSchema.optional(),
}).passthrough();
export type TriggerPayload = Record<string, unknown> & { _meta?: TriggerMeta };
