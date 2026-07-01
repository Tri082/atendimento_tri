import { createClient } from "@/lib/supabase/server";

export async function getTagsByOrg(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getTagsForConversation(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_tag_links")
    .select("tag:tags(id, name, color)")
    .eq("conversation_id", conversationId);
  return (data ?? [])
    .map((row) => row.tag as unknown as { id: string; name: string; color: string } | null)
    .filter((t): t is NonNullable<typeof t> => t !== null);
}

export async function getTagUsageCounts(orgId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_tag_links")
    .select("tag_id")
    .eq("organization_id", orgId);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.tag_id] = (counts[row.tag_id] ?? 0) + 1;
  }
  return counts;
}
