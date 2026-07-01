"use server";

import { revalidatePath } from "next/cache";
import { requireOrgMember } from "@/lib/auth/guards";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  type ApplyTagInput,
  applyTagSchema,
  type RemoveTagInput,
  removeTagSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

type ApplyKind = "human" | "bot" | "automation";
type LinkTable =
  | "conversation_tag_links"
  | "contact_tag_links"
  | "company_tag_links"
  | "deal_tag_links";
type LinkFkColumn = "conversation_id" | "contact_id" | "company_id" | "deal_id";
type EntityType = "conversation" | "contact" | "company" | "deal";

async function insertLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: LinkTable,
  fkColumn: LinkFkColumn,
  entityId: string,
  tagId: string,
  orgId: string,
  userId: string | null,
  kind: ApplyKind,
): Promise<{ inserted: boolean; error?: string }> {
  const payload = {
    [fkColumn]: entityId,
    tag_id: tagId,
    organization_id: orgId,
    applied_by_kind: kind,
    applied_by: userId,
  } as Record<string, unknown>;
  // Postgres-typed insert; types are constrained via the union
  const { data, error } = await supabase
    .from(table)
    // @ts-expect-error union de tabelas exige cast — payload é validado por trigger SQL
    .upsert(payload, { onConflict: `${fkColumn},tag_id`, ignoreDuplicates: true })
    .select(fkColumn);
  if (error) {
    logError(`tags.apply.${table}`, error);
    if (error.message.includes("não pode ser aplicada em")) {
      return { inserted: false, error: "Essa tag não pode ser aplicada nesse tipo de item." };
    }
    return { inserted: false, error: "Erro ao aplicar tag. Tente novamente." };
  }
  return { inserted: (data?.length ?? 0) > 0 };
}

/**
 * Aplica tag numa conversa. Se humano + tag tem `contact` no escopo +
 * conversa tem contact_id + propagateToContact=true (default), propaga.
 *
 * Bot e automação NUNCA propagam, mesmo com propagateToContact=true.
 */
export async function applyTagToConversationAction(
  input: ApplyTagInput,
  options: { kind?: ApplyKind } = {},
): Promise<ActionResult<{ propagated: boolean }>> {
  const parsed = applyTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const kind = options.kind ?? "human";
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const convResult = await insertLink(
    supabase,
    "conversation_tag_links",
    "conversation_id",
    parsed.data.entityId,
    parsed.data.tagId,
    org.id,
    kind === "human" ? user.id : null,
    kind,
  );
  if (convResult.error) return { ok: false, error: convResult.error };

  if (convResult.inserted) {
    emitAfter("conversation-tag-added", {
      orgId: org.id,
      triggerType: "conversation.tag_added",
      eventId: `${parsed.data.entityId}:${parsed.data.tagId}`,
      payload: {
        entity_id: parsed.data.entityId,
        entity_type: "conversation",
        tag_id: parsed.data.tagId,
        applied_by_kind: kind,
      },
    });
  }

  let propagated = false;
  const shouldPropagate = parsed.data.propagateToContact ?? true;
  if (kind === "human" && shouldPropagate) {
    const { data: tag } = await supabase
      .from("tags")
      .select("applies_to")
      .eq("id", parsed.data.tagId)
      .eq("organization_id", org.id)
      .maybeSingle();
    const appliesTo = (tag?.applies_to ?? []) as string[];
    if (appliesTo.includes("contact")) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("contact_id")
        .eq("id", parsed.data.entityId)
        .eq("organization_id", org.id)
        .maybeSingle();
      if (conv?.contact_id) {
        const propResult = await insertLink(
          supabase,
          "contact_tag_links",
          "contact_id",
          conv.contact_id,
          parsed.data.tagId,
          org.id,
          user.id,
          "human",
        );
        if (propResult.inserted) {
          propagated = true;
          emitAfter("contact-tag-added", {
            orgId: org.id,
            triggerType: "contact.tag_added",
            eventId: `${conv.contact_id}:${parsed.data.tagId}`,
            payload: {
              entity_id: conv.contact_id,
              entity_type: "contact",
              tag_id: parsed.data.tagId,
              applied_by_kind: "human",
              propagated_from: {
                entity_type: "conversation",
                entity_id: parsed.data.entityId,
              },
            },
          });
        }
      }
    }
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/inbox/${parsed.data.entityId}`);
  return { ok: true, data: { propagated } };
}

type SimpleApplyCfg = {
  table: "contact_tag_links" | "company_tag_links" | "deal_tag_links";
  fkColumn: "contact_id" | "company_id" | "deal_id";
  triggerType: string;
  triggerScope: string;
  pathFn: (slug: string, id: string) => string;
  entityType: "contact" | "company" | "deal";
};

async function applyTagToSimpleEntity(
  input: ApplyTagInput,
  options: { kind?: ApplyKind },
  cfg: SimpleApplyCfg,
): Promise<ActionResult> {
  const parsed = applyTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const kind = options.kind ?? "human";
  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const result = await insertLink(
    supabase,
    cfg.table,
    cfg.fkColumn,
    parsed.data.entityId,
    parsed.data.tagId,
    org.id,
    kind === "human" ? user.id : null,
    kind,
  );
  if (result.error) return { ok: false, error: result.error };
  if (result.inserted) {
    emitAfter(cfg.triggerScope, {
      orgId: org.id,
      triggerType: cfg.triggerType,
      eventId: `${parsed.data.entityId}:${parsed.data.tagId}`,
      payload: {
        entity_id: parsed.data.entityId,
        entity_type: cfg.entityType,
        tag_id: parsed.data.tagId,
        applied_by_kind: kind,
      },
    });
  }
  revalidatePath(cfg.pathFn(parsed.data.orgSlug, parsed.data.entityId));
  return { ok: true };
}

export async function applyTagToContactAction(
  input: ApplyTagInput,
  options: { kind?: ApplyKind } = {},
): Promise<ActionResult> {
  return applyTagToSimpleEntity(input, options, {
    table: "contact_tag_links",
    fkColumn: "contact_id",
    triggerType: "contact.tag_added",
    triggerScope: "contact-tag-added",
    pathFn: (slug, id) => `/app/${slug}/contatos/${id}`,
    entityType: "contact",
  });
}

export async function applyTagToCompanyAction(
  input: ApplyTagInput,
  options: { kind?: ApplyKind } = {},
): Promise<ActionResult> {
  return applyTagToSimpleEntity(input, options, {
    table: "company_tag_links",
    fkColumn: "company_id",
    triggerType: "company.tag_added",
    triggerScope: "company-tag-added",
    pathFn: (slug, id) => `/app/${slug}/empresas/${id}`,
    entityType: "company",
  });
}

export async function applyTagToDealAction(
  input: ApplyTagInput,
  options: { kind?: ApplyKind } = {},
): Promise<ActionResult> {
  return applyTagToSimpleEntity(input, options, {
    table: "deal_tag_links",
    fkColumn: "deal_id",
    triggerType: "deal.tag_added",
    triggerScope: "deal-tag-added",
    pathFn: (slug, id) => `/app/${slug}/deals/${id}`,
    entityType: "deal",
  });
}

type RemoveCfg = {
  table: LinkTable;
  fkColumn: LinkFkColumn;
  triggerType: string;
  triggerScope: string;
  entityType: EntityType;
  pathFn: (slug: string, id: string) => string;
};

async function removeFromEntity(input: RemoveTagInput, cfg: RemoveCfg): Promise<ActionResult> {
  const parsed = removeTagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();
  const { error, count } = await supabase
    .from(cfg.table)
    .delete({ count: "exact" })
    // cast: TS não infere o fk certo no union de tabelas, mas runtime aceita
    .eq(cfg.fkColumn as never, parsed.data.entityId)
    .eq("tag_id", parsed.data.tagId)
    .eq("organization_id", org.id);
  if (error) {
    logError(`tags.remove.${cfg.table}`, error);
    return { ok: false, error: "Erro ao remover tag." };
  }
  if ((count ?? 0) > 0) {
    emitAfter(cfg.triggerScope, {
      orgId: org.id,
      triggerType: cfg.triggerType,
      eventId: `${parsed.data.entityId}:${parsed.data.tagId}:rm`,
      payload: {
        entity_id: parsed.data.entityId,
        entity_type: cfg.entityType,
        tag_id: parsed.data.tagId,
      },
    });
  }
  revalidatePath(cfg.pathFn(parsed.data.orgSlug, parsed.data.entityId));
  return { ok: true };
}

export async function removeTagFromConversationAction(
  input: RemoveTagInput,
): Promise<ActionResult> {
  return removeFromEntity(input, {
    table: "conversation_tag_links",
    fkColumn: "conversation_id",
    triggerType: "conversation.tag_removed",
    triggerScope: "conversation-tag-removed",
    entityType: "conversation",
    pathFn: (slug, id) => `/app/${slug}/inbox/${id}`,
  });
}
export async function removeTagFromContactAction(input: RemoveTagInput): Promise<ActionResult> {
  return removeFromEntity(input, {
    table: "contact_tag_links",
    fkColumn: "contact_id",
    triggerType: "contact.tag_removed",
    triggerScope: "contact-tag-removed",
    entityType: "contact",
    pathFn: (slug, id) => `/app/${slug}/contatos/${id}`,
  });
}
export async function removeTagFromCompanyAction(input: RemoveTagInput): Promise<ActionResult> {
  return removeFromEntity(input, {
    table: "company_tag_links",
    fkColumn: "company_id",
    triggerType: "company.tag_removed",
    triggerScope: "company-tag-removed",
    entityType: "company",
    pathFn: (slug, id) => `/app/${slug}/empresas/${id}`,
  });
}
export async function removeTagFromDealAction(input: RemoveTagInput): Promise<ActionResult> {
  return removeFromEntity(input, {
    table: "deal_tag_links",
    fkColumn: "deal_id",
    triggerType: "deal.tag_removed",
    triggerScope: "deal-tag-removed",
    entityType: "deal",
    pathFn: (slug, id) => `/app/${slug}/deals/${id}`,
  });
}
