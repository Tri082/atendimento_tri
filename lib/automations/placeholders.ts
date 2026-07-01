import { randomBytes } from "node:crypto";

/**
 * Regex de placeholders que bloqueiam ativação. Fonte da verdade — importada
 * por `setAutomationStatusAction` (lib/automations/actions.server.ts) e
 * por `findPlaceholderPaths` abaixo.
 */
export const PLACEHOLDER_PATTERNS = [
  /PREENCHA[_\s]/i,
  /TROQUE[_\s]ESTE[_\s]SECRETO/i,
  /SEU[_\s]HOOK[_\s]AQUI/i,
  /PREENCH[_\s]/i,
  /SUBSTITUA[_\s]/i,
];

/**
 * Checa se uma string contém algum dos padrões de placeholder. Útil pra
 * varreduras pontuais fora do contexto de actions (ex.: forms, config raw).
 */
export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(text));
}

export interface PlaceholderHit {
  actionIndex: number;
  key: string;
  value: string;
}

interface ActionLike {
  config?: Record<string, unknown>;
}

/**
 * Varre as actions e retorna campos que ainda têm valor placeholder.
 * Só inspeciona valores string de primeiro nível em `config`. Aninhamento (ex.: payload de
 * webhook) é deixado pro form Fase B — placeholder em payload aninhado já é raro.
 */
export function findPlaceholderPaths(actions: ActionLike[]): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  actions.forEach((action, actionIndex) => {
    for (const [key, value] of Object.entries(action.config ?? {})) {
      if (typeof value !== "string") continue;
      if (PLACEHOLDER_PATTERNS.some((p) => p.test(value))) {
        hits.push({ actionIndex, key, value });
      }
    }
  });
  return hits;
}

export interface AutoFillContext {
  /** UUID da empresa padrão da org. `null` se org tem 0 ou >1 empresas. */
  defaultCompanyId: string | null;
}

interface AutomationInputLike {
  actions: ActionLike[];
  [key: string]: unknown;
}

/**
 * Substitui placeholders por valores reais quando dá pra inferir automaticamente.
 *
 * - `webhook_secret` com TROQUE_* → 32 bytes hex (64 chars).
 * - `company_id` com PREENCHA_* → defaultCompanyId, se houver.
 *
 * Não mexe em outros placeholders (ex.: `url` do webhook continua precisando do aluno preencher).
 */
export function applyTemplateAutoFill<T extends AutomationInputLike>(
  input: T,
  ctx: AutoFillContext,
): T {
  // Deep clone pra não mutar nested refs (ex.: `payload` em call_webhook
  // continuaria apontando pro template singleton de `lib/automations/templates.ts`).
  // Node 17+ tem structuredClone nativo; Next.js 16 exige Node 20+.
  const cloned: T = structuredClone(input);
  for (const action of cloned.actions) {
    if (!action.config) continue;
    for (const [key, value] of Object.entries(action.config)) {
      if (typeof value !== "string") continue;
      const isPlaceholder = PLACEHOLDER_PATTERNS.some((p) => p.test(value));
      if (!isPlaceholder) continue;
      if (key === "webhook_secret") {
        action.config[key] = randomBytes(32).toString("hex");
      } else if (key === "company_id" && ctx.defaultCompanyId) {
        action.config[key] = ctx.defaultCompanyId;
      }
    }
  }
  return cloned;
}
