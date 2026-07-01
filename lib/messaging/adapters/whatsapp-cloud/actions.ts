"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOrgRole } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { translateError } from "@/lib/messaging/errors";
import { getChannelConfig } from "@/lib/messaging/channel-config";
import { processSendOutbound } from "@/lib/messaging/router";
import { applyTemplateSync } from "@/lib/messaging/templates/sync";
import { createClient } from "@/lib/supabase/server";
import "@/lib/messaging";
import { whatsappCloudAdapter } from "./adapter";
import {
  channelIdInputSchema,
  connectChannelInputSchema,
  testSendTemplateInputSchema,
  type ChannelIdInput,
  type ConnectChannelInput,
  type TestSendTemplateInput,
} from "./action-schemas";
import { normalizePhone } from "@/lib/messaging/normalize";
import type { Json } from "@/types/supabase";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function connectWhatsappChannelAction(
  input: ConnectChannelInput,
): Promise<ActionResult<{ channelId: string; verifyToken: string }>> {
  const parsed = connectChannelInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const verifyToken = randomUUID();
  const fullConfig = {
    ...parsed.data.config,
    verifyToken,
    apiVersion: "v22.0",
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .insert({
      organization_id: org.id,
      type: "whatsapp_cloud",
      name: parsed.data.name,
      external_id: parsed.data.config.phoneNumberId,
      config: fullConfig as Json,
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError("whatsapp.connect", error);
    return { ok: false, error: "Não foi possível conectar o canal. Verifique os dados e tente novamente." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels`);
  return { ok: true, data: { channelId: data.id, verifyToken } };
}

export async function verifyWhatsappChannelAction(
  input: ChannelIdInput,
): Promise<ActionResult<{ templatesSynced: number }>> {
  const parsed = channelIdInputSchema.safeParse(input);
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
    const supabase = await createClient();
    await supabase
      .from("channels")
      .update({ status: "connected", last_error: null })
      .eq("id", parsed.data.channelId);

    const sync = await applyTemplateSync({
      organizationId: org.id,
      channelId: parsed.data.channelId,
      templates,
    });

    revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels`);
    revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels/whatsapp-cloud/${parsed.data.channelId}`);
    return { ok: true, data: { templatesSynced: sync.synced } };
  } catch (err) {
    logError("whatsapp.verify", err);
    const supabase = await createClient();
    await supabase
      .from("channels")
      .update({ status: "error", last_error: translateError(err) })
      .eq("id", parsed.data.channelId);
    return { ok: false, error: translateError(err) };
  }
}

export async function disconnectWhatsappChannelAction(
  input: ChannelIdInput,
): Promise<ActionResult> {
  const parsed = channelIdInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", parsed.data.channelId)
    .eq("organization_id", org.id);

  if (error) {
    logError("whatsapp.disconnect", error);
    return { ok: false, error: "Não foi possível remover o canal." };
  }

  revalidatePath(`/app/${parsed.data.orgSlug}/settings/channels`);
  return { ok: true };
}

export async function testSendTemplateAction(
  input: TestSendTemplateInput,
): Promise<ActionResult<{ messageId: string }>> {
  const parsed = testSendTemplateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { user, org } = await requireOrgRole({
    orgSlug: parsed.data.orgSlug,
    roles: ["owner", "admin"],
  });

  const to = normalizePhone(parsed.data.to);
  if (!to) return { ok: false, error: "Telefone inválido." };

  const supabase = await createClient();

  // Reusa ou cria conversation pra esse (channel, to)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("channel_id", parsed.data.channelId)
    .eq("external_thread_id", to)
    .maybeSingle();

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created, error: convErr } = await supabase
      .from("conversations")
      .insert({
        organization_id: org.id,
        channel_id: parsed.data.channelId,
        external_thread_id: to,
        status: "open",
      })
      .select("id")
      .single();
    if (convErr || !created) {
      logError("whatsapp.test-send.conv", convErr);
      return { ok: false, error: "Não foi possível criar a conversa de teste." };
    }
    conversationId = created.id;
  }

  const templatePayload = {
    template: {
      name: parsed.data.templateName,
      language: parsed.data.language,
      params: parsed.data.params,
    },
    test_send: true,
  };

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      organization_id: org.id,
      conversation_id: conversationId,
      direction: "outbound",
      sender_user_id: user.id,
      sender_kind: "user",
      body: `[template: ${parsed.data.templateName}]`,
      status: "sending",
      provider_metadata: templatePayload as Json,
    })
    .select("id")
    .single();

  if (msgErr || !msg) {
    logError("whatsapp.test-send.msg", msgErr);
    return { ok: false, error: "Não foi possível disparar o teste." };
  }

  after(() => processSendOutbound(msg.id));

  return { ok: true, data: { messageId: msg.id } };
}
