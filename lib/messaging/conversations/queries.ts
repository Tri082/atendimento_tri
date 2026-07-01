import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";

export interface ListFilters {
  status?: "open" | "pending" | "resolved";
  channelId?: string;
  assigneeId?: string | "me";
  tagIds?: string[];
  currentUserId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getConversationsList(orgId: string, filters: ListFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select(`
      id, status, assignee_id, handled_by, last_message_at, last_inbound_at, unread_count, external_thread_id, display_name,
      channel:channels!inner(id, type, name),
      contact:contacts(id, name, email, phone),
      tags:conversation_tag_links(
        tag:tags(id, name, color)
      )
    `)
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.channelId) query = query.eq("channel_id", filters.channelId);
  if (filters.assigneeId === "me" && filters.currentUserId) {
    query = query.eq("assignee_id", filters.currentUserId);
  } else if (filters.assigneeId && filters.assigneeId !== "me") {
    query = query.eq("assignee_id", filters.assigneeId);
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data: links } = await supabase
      .from("conversation_tag_links")
      .select("conversation_id")
      .eq("organization_id", orgId)
      .in("tag_id", filters.tagIds);
    const convIds = (links ?? []).map((l) => l.conversation_id);
    if (convIds.length === 0) return { data: [], error: null };
    query = query.in("id", convIds);
  }

  const { data, error } = await query;
  if (error) {
    logError("conversations.list", error);
    return { data: [], error };
  }
  return { data: data ?? [], error: null };
}

export async function getConversationById(orgId: string, conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(`
      id, organization_id, channel_id, contact_id, status, assignee_id, handled_by,
      last_message_at, last_inbound_at, unread_count, external_thread_id, display_name, created_at,
      agent_status,
      channel:channels!inner(id, type, name, config, agent_id, agent:agents(id, name, is_active)),
      contact:contacts(id, name, email, phone)
    `)
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
}

export async function getMessagesForConversation(
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
) {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.before) query = query.lt("created_at", opts.before);
  const { data } = await query;
  return (data ?? []).reverse();
}

export async function getLastMessagePreview(conversationId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("body, direction")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const prefix = data.direction === "outbound" ? "Você: " : "";
  return `${prefix}${data.body ?? "[mídia]"}`.slice(0, 80);
}
