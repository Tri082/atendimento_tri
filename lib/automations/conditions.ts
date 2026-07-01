import { createServiceClient } from "@/lib/supabase/service";
import { resolvePath } from "./path";
import type { Condition } from "./schemas";

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export type EvalCtx = { orgId?: string };

/**
 * Avalia uma condição. Maioria dos operadores é síncrona; `has_tag`/`lacks_tag`
 * fazem lookup no banco e exigem `ctx.orgId` (passado pelo engine).
 */
export async function evaluateSingleCondition(
  cond: Condition,
  context: Record<string, unknown>,
  ctx: EvalCtx = {},
): Promise<boolean> {
  if (cond.op === "has_tag" || cond.op === "lacks_tag") {
    return evaluateHasTag(cond, context, ctx, cond.op === "lacks_tag");
  }
  const fieldValue = resolvePath(context, cond.field);
  const expected = cond.value;
  switch (cond.op) {
    case "eq":
      return fieldValue === expected;
    case "ne":
      return fieldValue !== expected;
    case "gt":
      return (
        typeof fieldValue === "number" &&
        typeof expected === "number" &&
        fieldValue > expected
      );
    case "gte":
      return (
        typeof fieldValue === "number" &&
        typeof expected === "number" &&
        fieldValue >= expected
      );
    case "lt":
      return (
        typeof fieldValue === "number" &&
        typeof expected === "number" &&
        fieldValue < expected
      );
    case "lte":
      return (
        typeof fieldValue === "number" &&
        typeof expected === "number" &&
        fieldValue <= expected
      );
    case "contains":
      if (Array.isArray(fieldValue)) return fieldValue.includes(expected);
      if (typeof fieldValue === "string" && typeof expected === "string")
        return fieldValue.includes(expected);
      return false;
    case "not_contains":
      if (Array.isArray(fieldValue)) return !fieldValue.includes(expected);
      if (typeof fieldValue === "string" && typeof expected === "string")
        return !fieldValue.includes(expected);
      return true;
    case "in":
      return Array.isArray(expected) && expected.includes(fieldValue);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(fieldValue);
    case "is_empty":
      return isEmpty(fieldValue);
    case "is_not_empty":
      return !isEmpty(fieldValue);
    default:
      return false;
  }
}

/**
 * `field` no formato `<entity>.has_tag` (entity = contact|deal|company|conversation).
 * `value` é a tag_id (uuid). Sem orgId no ctx, falha closed (returns false / lacks=true).
 */
async function evaluateHasTag(
  cond: Condition,
  context: Record<string, unknown>,
  ctx: EvalCtx,
  negate: boolean,
): Promise<boolean> {
  if (!ctx.orgId) return negate;
  const entityType = cond.field.split(".")[0];
  const tagId = typeof cond.value === "string" ? cond.value : undefined;
  if (!tagId) return negate;
  const entityId = resolvePath(context, `${entityType}.id`);
  if (typeof entityId !== "string") return negate;
  const table =
    entityType === "contact"
      ? "contact_tag_links"
      : entityType === "deal"
        ? "deal_tag_links"
        : entityType === "company"
          ? "company_tag_links"
          : entityType === "conversation"
            ? "conversation_tag_links"
            : null;
  if (!table) return negate;
  const fk =
    entityType === "contact"
      ? "contact_id"
      : entityType === "deal"
        ? "deal_id"
        : entityType === "company"
          ? "company_id"
          : "conversation_id";
  const supabase = createServiceClient();
  const { count } = await supabase
    .from(table)
    .select("tag_id", { count: "exact", head: true })
    // cast: TS não infere fk no union; runtime ok
    .eq(fk as never, entityId)
    .eq("tag_id", tagId)
    .eq("organization_id", ctx.orgId);
  const exists = (count ?? 0) > 0;
  return negate ? !exists : exists;
}

export interface ConditionsResult {
  pass: boolean;
  failedAt?: number;
  reason?: string;
}

export async function evaluateConditions(
  conditions: Condition[],
  context: Record<string, unknown>,
  ctx: EvalCtx = {},
): Promise<ConditionsResult> {
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (!c) continue;
    if (!(await evaluateSingleCondition(c, context, ctx))) {
      return {
        pass: false,
        failedAt: i,
        reason: `Condição '${c.field} ${c.op}${c.value !== undefined ? ` ${JSON.stringify(c.value)}` : ""}' bloqueou`,
      };
    }
  }
  return { pass: true };
}
