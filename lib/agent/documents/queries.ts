import { createClient } from "@/lib/supabase/server";

export async function getDocuments(agentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_documents")
    .select("id, filename, mime_type, size_bytes, status, chunk_count, error_message, created_at, ready_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
