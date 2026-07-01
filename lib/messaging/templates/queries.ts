import { createClient } from "@/lib/supabase/server";

export async function getApprovedTemplatesByChannel(channelId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, meta_id, name, language, category, components, param_count")
    .eq("channel_id", channelId)
    .eq("status", "APPROVED")
    .order("name", { ascending: true });
  if (error) return [];
  return data ?? [];
}
