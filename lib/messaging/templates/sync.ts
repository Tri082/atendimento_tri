import { logError } from "@/lib/logger";
import type { RemoteTemplate } from "@/lib/messaging/adapter";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function applyTemplateSync(opts: {
  organizationId: string;
  channelId: string;
  templates: RemoteTemplate[];
}): Promise<{ synced: number; removed: number }> {
  const supabase = await createClient();

  // 1. Listar existentes
  const { data: existing, error: selErr } = await supabase
    .from("whatsapp_templates")
    .select("id, name, language")
    .eq("channel_id", opts.channelId);

  if (selErr) {
    logError("templates.sync.select", selErr);
    return { synced: 0, removed: 0 };
  }

  // 2. Upsert dos templates novos
  const payload = opts.templates.map((t) => ({
    organization_id: opts.organizationId,
    channel_id: opts.channelId,
    meta_id: t.metaId,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    components: t.components as Json,
    param_count: t.paramCount,
    synced_at: new Date().toISOString(),
  }));

  if (payload.length > 0) {
    const { error: upErr } = await supabase
      .from("whatsapp_templates")
      .upsert(payload, { onConflict: "channel_id,name,language" });
    if (upErr) {
      logError("templates.sync.upsert", upErr);
      return { synced: 0, removed: 0 };
    }
  }

  // 3. Determinar quais sumiram (existem local mas não vieram da Meta)
  const incomingKeys = new Set(
    opts.templates.map((t) => `${t.name}|${t.language}`),
  );
  const removeIds = (existing ?? [])
    .filter((e) => !incomingKeys.has(`${e.name}|${e.language}`))
    .map((e) => (e as { id: string }).id);

  let removed = 0;
  if (removeIds.length > 0) {
    const { error: delErr } = await supabase
      .from("whatsapp_templates")
      .delete()
      .eq("channel_id", opts.channelId)
      .in("id", removeIds);
    if (!delErr) removed = removeIds.length;
  }

  return { synced: opts.templates.length, removed };
}
