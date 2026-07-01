"use server";

import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { translateError } from "@/lib/messaging/errors";
import { getChannelConfig } from "@/lib/messaging/channel-config";
import { whatsappCloudAdapter } from "@/lib/messaging/adapters/whatsapp-cloud/adapter";
import {
  syncTemplatesInputSchema,
  type SyncTemplatesInput,
} from "./schemas";
import { applyTemplateSync } from "./sync";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function syncTemplatesAction(
  input: SyncTemplatesInput,
): Promise<ActionResult<{ synced: number; removed: number }>> {
  const parsed = syncTemplatesInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const config = await getChannelConfig({
    channelId: parsed.data.channelId,
    orgSlug: parsed.data.orgSlug,
  });
  if (!config) return { ok: false, error: "Canal não encontrado." };

  try {
    if (!whatsappCloudAdapter.listTemplates) {
      return { ok: false, error: "Adapter não suporta listagem de templates." };
    }
    const templates = await whatsappCloudAdapter.listTemplates(config);
    const result = await applyTemplateSync({
      organizationId: org.id,
      channelId: parsed.data.channelId,
      templates,
    });
    revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels/whatsapp-cloud/${parsed.data.channelId}`);
    return { ok: true, data: result };
  } catch (err) {
    logError("templates.sync.action", err);
    return { ok: false, error: translateError(err) };
  }
}
