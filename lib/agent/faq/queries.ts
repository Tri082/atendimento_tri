import { createClient } from "@/lib/supabase/server";

export async function getFaqItems(agentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_faq_items")
    .select("id, question, answer, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}
