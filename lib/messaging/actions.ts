"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOrgMember } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import "./index";
import type { ChannelType } from "./adapter";
import { getAdapter } from "./registry";
import { processSendOutbound } from "./router";
import {
  type SendMessageInput,
  type SendTemplateInput,
  sendMessageSchema,
  sendTemplateSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const WHATSAPP_WINDOW_HOURS = 24;

export async function sendMessageAction(
  input: SendMessageInput,
): Promise<ActionResult<{ messageId: string }>> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(
      `id, organization_id, external_thread_id, last_inbound_at,
       channel:channels!inner(id, type, config)`,
    )
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (convErr || !conv) {
    logError("messaging.send.lookup", convErr ?? new Error("conversation not found"));
    return { ok: false, error: "Conversa não encontrada." };
  }

  type ChannelRow = { id: string; type: string; config: unknown };
  const channel = conv.channel as unknown as ChannelRow;

  if (channel.type === "whatsapp_cloud") {
    const last = conv.last_inbound_at ? new Date(conv.last_inbound_at).getTime() : 0;
    const ageHours = (Date.now() - last) / (1000 * 60 * 60);
    if (last === 0 || ageHours > WHATSAPP_WINDOW_HOURS) {
      return {
        ok: false,
        error: "Fora da janela de 24h. Use um template pra iniciar conversa.",
      };
    }
  }

  const firstMedia = parsed.data.media?.[0];
  const { data: inserted, error: insertErr } = await supabase
    .from("messages")
    .insert({
      organization_id: org.id,
      conversation_id: parsed.data.conversationId,
      direction: "outbound",
      sender_user_id: user.id,
      sender_kind: "user",
      body: parsed.data.body ?? null,
      media_url: firstMedia?.url ?? null,
      media_type: firstMedia?.mimeType ?? null,
      attachments:
        parsed.data.media && parsed.data.media.length > 1 ? parsed.data.media.slice(1) : [],
      reply_to_message_id: parsed.data.replyToMessageId ?? null,
      status: "sending",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    logError("messaging.send.insert", insertErr);
    return { ok: false, error: "Não foi possível enviar a mensagem." };
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);

  after(() => processSendOutbound(inserted.id));

  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true, data: { messageId: inserted.id } };
}

export async function sendTemplateAction(
  input: SendTemplateInput,
): Promise<ActionResult<{ messageId: string }>> {
  const parsed = sendTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { user, org } = await requireOrgMember({ orgSlug: parsed.data.orgSlug });
  const supabase = await createClient();

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select(
      `id, organization_id, external_thread_id,
       channel:channels!inner(id, type, config)`,
    )
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (convErr || !conv) {
    return { ok: false, error: "Conversa não encontrada." };
  }

  type ChannelRow = { id: string; type: string; config: unknown };
  const channel = conv.channel as unknown as ChannelRow;

  let adapter;
  try {
    adapter = getAdapter(channel.type as ChannelType);
  } catch {
    return { ok: false, error: "Canal não suporta envio." };
  }

  if (!adapter.capabilities.templates) {
    return { ok: false, error: "Este canal não suporta templates." };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("messages")
    .insert({
      organization_id: org.id,
      conversation_id: parsed.data.conversationId,
      direction: "outbound",
      sender_user_id: user.id,
      sender_kind: "user",
      body: `[template: ${parsed.data.templateName}]`,
      status: "sending",
      provider_metadata: {
        template: {
          name: parsed.data.templateName,
          language: parsed.data.language,
          params: parsed.data.params,
        },
      },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    logError("messaging.send-template.insert", insertErr);
    return { ok: false, error: "Não foi possível enviar o template." };
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);

  after(() => processSendOutbound(inserted.id));

  revalidatePath(`/app/${parsed.data.orgSlug}/inbox`);
  return { ok: true, data: { messageId: inserted.id } };
}
