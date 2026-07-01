import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TagScope } from "./schemas";

export type Tag = {
  id: string;
  name: string;
  color: string;
  appliesTo: TagScope[];
  createdAt: string;
};

export type TagWithUsage = Tag & {
  usage: {
    conversation: number;
    contact: number;
    company: number;
    deal: number;
  };
};

export type TagSuggestion = {
  id: string;
  name: string;
  suggestedBy: "agent" | "automation";
  sourceEntity: "conversation" | "contact" | "deal";
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type EntityTag = {
  tagId: string;
  name: string;
  color: string;
  appliedByKind: "human" | "bot" | "automation";
  appliedAt: string;
};

export async function listTags(orgId: string, filterScope?: TagScope): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color, applies_to, created_at")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (error || !data) return [];
  const tags: Tag[] = data.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    appliesTo: (r.applies_to ?? []) as TagScope[],
    createdAt: r.created_at,
  }));
  if (filterScope) return tags.filter((t) => t.appliesTo.includes(filterScope));
  return tags;
}

export async function listTagsWithUsage(orgId: string): Promise<TagWithUsage[]> {
  const supabase = await createClient();
  const tags = await listTags(orgId);
  if (tags.length === 0) return [];
  const tagIds = tags.map((t) => t.id);

  const [convCounts, contactCounts, companyCounts, dealCounts] = await Promise.all([
    countLinks(supabase, "conversation_tag_links", tagIds),
    countLinks(supabase, "contact_tag_links", tagIds),
    countLinks(supabase, "company_tag_links", tagIds),
    countLinks(supabase, "deal_tag_links", tagIds),
  ]);

  return tags.map((t) => ({
    ...t,
    usage: {
      conversation: convCounts.get(t.id) ?? 0,
      contact: contactCounts.get(t.id) ?? 0,
      company: companyCounts.get(t.id) ?? 0,
      deal: dealCounts.get(t.id) ?? 0,
    },
  }));
}

type LinkTable =
  | "conversation_tag_links"
  | "contact_tag_links"
  | "company_tag_links"
  | "deal_tag_links";

async function countLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: LinkTable,
  tagIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data } = await supabase.from(table).select("tag_id").in("tag_id", tagIds);
  if (!data) return map;
  for (const row of data) {
    map.set(row.tag_id, (map.get(row.tag_id) ?? 0) + 1);
  }
  return map;
}

export async function listTagsOnConversation(
  orgId: string,
  conversationId: string,
): Promise<EntityTag[]> {
  return listTagsOnEntity(orgId, "conversation_tag_links", "conversation_id", conversationId);
}
export async function listTagsOnContact(orgId: string, contactId: string): Promise<EntityTag[]> {
  return listTagsOnEntity(orgId, "contact_tag_links", "contact_id", contactId);
}
export async function listTagsOnCompany(orgId: string, companyId: string): Promise<EntityTag[]> {
  return listTagsOnEntity(orgId, "company_tag_links", "company_id", companyId);
}
export async function listTagsOnDeal(orgId: string, dealId: string): Promise<EntityTag[]> {
  return listTagsOnEntity(orgId, "deal_tag_links", "deal_id", dealId);
}

async function listTagsOnEntity(
  orgId: string,
  table: LinkTable,
  fkColumn: "conversation_id" | "contact_id" | "company_id" | "deal_id",
  entityId: string,
): Promise<EntityTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("tag_id, applied_by_kind, applied_at, tags!inner(name, color)")
    // cast: TS não infere o fk certo no union de tabelas, mas runtime aceita
    .eq(fkColumn as never, entityId)
    .eq("organization_id", orgId)
    .order("applied_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => {
    const tag = r.tags as unknown as { name: string; color: string };
    return {
      tagId: r.tag_id,
      name: tag.name,
      color: tag.color,
      appliedByKind: r.applied_by_kind as "human" | "bot" | "automation",
      appliedAt: r.applied_at,
    };
  });
}

export async function listPendingSuggestions(orgId: string): Promise<TagSuggestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tag_suggestions")
    .select("id, name, suggested_by, source_entity, occurrences, first_seen_at, last_seen_at")
    .eq("organization_id", orgId)
    .is("resolved_status", null)
    .order("last_seen_at", { ascending: false });
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    suggestedBy: r.suggested_by as "agent" | "automation",
    sourceEntity: r.source_entity as "conversation" | "contact" | "deal",
    occurrences: r.occurrences,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  }));
}
