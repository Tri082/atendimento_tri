import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { triggerAgent } from "@/lib/agent/trigger";
import { emitAfter } from "@/lib/automations/emit";
import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import type { ChannelType, MessagingAdapter, NormalizedEvent } from "./adapter";
import { getChannelConfigSystem } from "./channel-config";
import { translateError } from "./errors";
import { normalizePhone } from "./normalize";
import { getAdapter } from "./registry";

const STATUS_RANK: Record<string, number> = {
  queued: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 99,
};

export { STATUS_RANK };

/**
 * Executa o envio outbound de uma mensagem já gravada em status='sending'.
 * Chamada via Next.js after() dentro da Server Action, ou via cadeia after()
 * iniciada num webhook (sem sessão de user — automações, agente IA).
 *
 * Usa SERVICE client porque pode rodar sem cookies da request (cadeia after()
 * vinda do webhook não carrega auth.uid). RLS bloquearia o SELECT da mensagem
 * e a função sairia silenciosa, deixando o status='sending' até recovery.
 *
 * Em caso de falha, marca a mensagem como 'failed' e loga.
 * NÃO joga exception — é o último passo do request, nada acima trata.
 */
export async function processSendOutbound(messageId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: msg, error } = await supabase
    .from("messages")
    .select(
      `id, organization_id, conversation_id, body, media_url, media_type, reply_to_message_id, status, provider_metadata,
       conversation:conversations!inner(
         channel_id, external_thread_id,
         channel:channels!inner(id, type, config)
       )`,
    )
    .eq("id", messageId)
    .single();

  if (error || !msg) {
    logError("messaging.send", error ?? new Error("message not found"));
    return;
  }

  if (msg.status !== "sending") {
    return;
  }

  type RowChannel = { id: string; type: ChannelType; config: Record<string, unknown> };
  type RowConversation = { channel_id: string; external_thread_id: string; channel: RowChannel };
  const conv = msg.conversation as unknown as RowConversation;
  const channel = conv.channel;

  let adapter: MessagingAdapter;
  try {
    adapter = getAdapter(channel.type);
  } catch (err) {
    await markFailed(messageId, translateError(err));
    return;
  }

  try {
    const tpl = (msg.provider_metadata as { template?: { name: string; language: string; params: Record<string, string> } } | null)?.template;

    let externalId: string;
    if (tpl) {
      const result = await adapter.sendTemplate(channel.config, {
        to: conv.external_thread_id,
        templateName: tpl.name,
        language: tpl.language,
        params: tpl.params,
      });
      if ("unsupported" in result) {
        await markFailed(messageId, "Canal não suporta templates.");
        return;
      }
      externalId = result.externalId;
    } else {
      const result = await adapter.sendMessage(channel.config, {
        to: conv.external_thread_id,
        body: msg.body ?? undefined,
        media:
          msg.media_url && msg.media_type
            ? [{ url: msg.media_url, mimeType: msg.media_type }]
            : undefined,
      });
      externalId = result.externalId;
    }

    const { error: upErr } = await supabase
      .from("messages")
      .update({
        status: "sent",
        external_id: externalId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("status", "sending");

    if (upErr) logError("messaging.send-update", upErr);
  } catch (err) {
    logError("messaging.send", err);
    await markFailed(messageId, translateError(err));
  }
}

async function markFailed(messageId: string, reason: string): Promise<void> {
  // Service client — mesma razão de processSendOutbound (chain sem cookies).
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("messages")
    .update({ status: "failed", failure_reason: reason })
    .eq("id", messageId)
    .eq("status", "sending");
  if (error) logError("messaging.send-mark-failed", error);
}

// ===== Stubs preenchidos nas Tasks 13 e 14 =====

export async function processInboundMessage(
  channelType: ChannelType,
  event: NormalizedEvent,
): Promise<void> {
  if (event.kind !== "message") return;

  // Chamado via `after()` do webhook handler — sem cookie de sessão. Usa
  // service client (bypass RLS) — o webhook já foi autenticado por HMAC/
  // bearer secret específico do channel antes desta função rodar.
  const supabase = createServiceClient();

  const raw = (event.raw ?? {}) as { channelId?: string; phoneNumberId?: string; instanceName?: string };
  type ChannelLite = {
    id: string;
    type: string;
    organization_id: string;
    agent_id: string | null;
    agent: { is_active: boolean } | null;
  };
  let channel: ChannelLite | null = null;

  if (raw.channelId) {
    const { data } = await supabase
      .from("channels")
      .select("id, type, organization_id, agent_id, agent:agents(is_active)")
      .eq("id", raw.channelId)
      .maybeSingle();
    channel = data as unknown as ChannelLite | null;
  } else if (raw.phoneNumberId) {
    const { data } = await supabase
      .from("channels")
      .select("id, type, organization_id, agent_id, agent:agents(is_active)")
      .eq("external_id", raw.phoneNumberId)
      .eq("type", channelType)
      .maybeSingle();
    channel = data as unknown as ChannelLite | null;
  } else if (raw.instanceName) {
    const { data } = await supabase
      .from("channels")
      .select("id, type, organization_id, agent_id, agent:agents(is_active)")
      .eq("external_id", raw.instanceName)
      .eq("type", channelType)
      .maybeSingle();
    channel = data as unknown as ChannelLite | null;
  }

  if (!channel || channel.type !== channelType) return;

  const externalThread = event.externalThreadId;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id, organization_id, agent_status, display_name")
    .eq("channel_id", channel.id)
    .eq("external_thread_id", externalThread)
    .maybeSingle();

  let conversationId: string;
  let convAgentStatus: string = "idle";

  // Nome que o provider passa (pushName WhatsApp etc.) — usado pra display
  // até o contato ser cadastrado no CRM. SÓ aceita quando `!fromMe` —
  // mensagens outbound (humano respondendo pelo celular) carregam o pushName
  // do DONO da conta, não do contato. Sem esse guard, a primeira resposta
  // outbound sobrescreve o nome do contato pelo nome do operador.
  const incomingDisplayName =
    !event.fromMe && event.contactName?.trim() ? event.contactName.trim() : null;

  if (existingConv) {
    conversationId = existingConv.id;
    convAgentStatus = existingConv.agent_status ?? "idle";
    // Atualiza display_name se o provider mandou um nome novo e a conversation
    // ainda não tem ou mudou. NUNCA sobrescreve `contact_id` setado (UI/users
    // mandam aí), só este campo cosmético.
    if (incomingDisplayName && incomingDisplayName !== existingConv.display_name) {
      await supabase
        .from("conversations")
        .update({ display_name: incomingDisplayName })
        .eq("id", conversationId);
    }
  } else {
    let contactId: string | null = null;
    // Sub-H L-2: filtra por phone direto no lookup. Antes o `.maybeSingle()`
    // pegava QUALQUER contato da org (e o `phoneMatches` validava em memória),
    // o que era O(1) random + falha silenciosa quando havia ≥2 contatos.
    // Agora normaliza o telefone do thread e procura na coluna `phone` direto.
    const normalizedThread = normalizePhone(externalThread);
    if (normalizedThread) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", channel.organization_id)
        .eq("phone", normalizedThread)
        .maybeSingle();
      if (contact) {
        contactId = contact.id;
      }
    }

    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        organization_id: channel.organization_id,
        channel_id: channel.id,
        contact_id: contactId,
        external_thread_id: externalThread,
        display_name: incomingDisplayName,
        status: "open",
      })
      .select("id, agent_status")
      .single();

    if (convErr) {
      if ((convErr as { code?: string }).code === "23505") {
        const { data: raced } = await supabase
          .from("conversations")
          .select("id, agent_status")
          .eq("channel_id", channel.id)
          .eq("external_thread_id", externalThread)
          .maybeSingle();
        if (!raced) {
          logError("messaging.inbound", convErr);
          return;
        }
        conversationId = raced.id;
        convAgentStatus = raced.agent_status ?? "idle";
      } else {
        logError("messaging.inbound", convErr);
        return;
      }
    } else if (newConv) {
      conversationId = newConv.id;
      convAgentStatus = newConv.agent_status ?? "idle";

      // Sub-H: emit conversation.created (idempotente via conversationId)
      {
        const orgId = channel.organization_id;
        const convId = conversationId;
        const externalThreadSnap = externalThread;
        const channelInfo = { id: channel.id, type: channel.type, name: "" };
        const displayNameSnap = incomingDisplayName;
        const contactInfo = contactId
          ? { id: contactId, name: null, phone: externalThreadSnap, email: null }
          : null;
        emitAfter("conv-created", {
          orgId,
          triggerType: "conversation.created",
          eventId: convId,
          payload: {
            conversation: {
              id: convId,
              external_thread_id: externalThreadSnap,
              display_name: displayNameSnap,
            },
            channel: channelInfo,
            contact: contactInfo,
            org: { id: orgId, name: "", slug: "" },
          },
        });
      }
    } else {
      return;
    }
  }

  // Resolver mídia: se veio externalMediaId mas não url, baixar via adapter.fetchMedia
  const firstMedia = event.message?.media?.[0];
  let resolvedMediaUrl: string | null = firstMedia?.url ?? null;
  let resolvedMediaType: string | null = firstMedia?.mimeType ?? null;

  if (firstMedia?.externalMediaId && !firstMedia.url) {
    try {
      const adapter = getAdapter(channelType);
      const cfgRow = await getChannelConfigSystem(channel.id);
      if (adapter.fetchMedia && cfgRow) {
        const { data, mimeType } = await adapter.fetchMedia(
          firstMedia.externalMediaId,
          cfgRow.config,
        );
        const ext = mimeToExt(mimeType);
        const path = `${channel.organization_id}/${conversationId}/${randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("messaging")
          .upload(path, data, { contentType: mimeType });
        if (!upErr) {
          resolvedMediaUrl = path;
          resolvedMediaType = mimeType;
        } else {
          logError("messaging.inbound.media-upload", upErr);
        }
      }
    } catch (err) {
      logError("messaging.inbound.media-fetch", err);
    }
  }

  // `fromMe` no Evolution: ou é eco do envio que o app fez (idempotência
  // via UNIQUE(conversation_id, external_id) ignora silenciosamente),
  // ou foi o humano respondendo pelo WhatsApp do próprio celular —
  // nesse caso registramos como outbound real pra aparecer na inbox.
  const isOutbound = event.fromMe === true;

  const { data: insertedMsg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      organization_id: channel.organization_id,
      conversation_id: conversationId,
      direction: isOutbound ? "outbound" : "inbound",
      sender_kind: isOutbound ? "user" : "contact",
      body: event.message?.body ?? null,
      media_url: resolvedMediaUrl,
      media_type: resolvedMediaType,
      attachments: (event.message?.media && event.message.media.length > 1
        ? event.message.media.slice(1)
        : []) as unknown as import("@/types/supabase").Json,
      status: "delivered",
      external_id: event.externalMessageId,
      provider_metadata: { raw: event.raw } as unknown as import("@/types/supabase").Json,
      sent_at: event.timestamp,
    })
    .select("id")
    .single();

  if (msgErr) {
    if ((msgErr as { code?: string }).code === "23505") return;
    logError("messaging.inbound.insert", msgErr);
    return;
  }

  // Atualiza timestamps + unread_count
  // Nota: unread_count via read+write (race off-by-one tolerável na foundation;
  // upgrade pra RPC atômica fica pra Sub-projeto C, quando a UI exibir o badge).
  if (insertedMsg) {
    // Outbound (humano respondeu pelo celular) NÃO incrementa unread_count
    // e NÃO mexe em last_inbound_at — só toca last_message_at.
    if (isOutbound) {
      await supabase
        .from("conversations")
        .update({ last_message_at: event.timestamp })
        .eq("id", conversationId);
    } else {
      const { data: convNow } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("id", conversationId)
        .maybeSingle();
      await supabase
        .from("conversations")
        .update({
          last_message_at: event.timestamp,
          last_inbound_at: event.timestamp,
          unread_count: (convNow?.unread_count ?? 0) + 1,
        })
        .eq("id", conversationId);
    }

    // Sub-H: emit message.received — só pra inbound (humano respondendo
    // pelo celular NÃO dispara automações de "mensagem recebida").
    if (!isOutbound) {
      const orgId = channel.organization_id;
      const msgId = insertedMsg.id;
      const convId = conversationId;
      const channelInfo = { id: channel.id, type: channel.type, name: "" };
      const body = event.message?.body ?? null;
      const mediaType = resolvedMediaType;
      emitAfter("msg-received", {
        orgId,
        triggerType: "message.received",
        eventId: msgId,
        payload: {
          message: { id: msgId, body, media_type: mediaType },
          conversation: { id: convId },
          channel: channelInfo,
          contact: null,
          org: { id: orgId, name: "", slug: "" },
        },
      });
    }
  }

  // Sub-projeto E: dispara agente se canal tem agent_id setado, agente ativo,
  // conv não pausada, e a mensagem é inbound (não acionar agente com base na
  // resposta manual do próprio humano).
  if (
    !isOutbound &&
    channel.agent_id &&
    channel.agent?.is_active &&
    convAgentStatus !== "paused_handoff"
  ) {
    const agentId = channel.agent_id;
    after(() => triggerAgent(conversationId, agentId));
  }
}

export async function processStatusUpdate(
  _channelType: ChannelType,
  event: NormalizedEvent,
): Promise<void> {
  if (event.kind !== "status" || !event.status) return;

  // Chamado via `after()` do webhook handler — sem cookie de sessão. Usa
  // service client pelo mesmo motivo de `processInboundMessage`.
  const supabase = createServiceClient();
  const newStatus = event.status.value;
  const newRank = STATUS_RANK[newStatus];

  const { data: msg } = await supabase
    .from("messages")
    .select("id, status, organization_id")
    .eq("external_id", event.externalMessageId)
    .maybeSingle();

  if (!msg) return;
  if (msg.status === "failed") return;

  const currentRank = STATUS_RANK[msg.status] ?? 0;
  if (newRank === undefined || newRank <= currentRank) return;

  const { error } = await supabase
    .from("messages")
    .update(
      newStatus === "failed" && event.status.failureReason
        ? { status: newStatus, failure_reason: event.status.failureReason }
        : { status: newStatus },
    )
    .eq("id", msg.id)
    .eq("status", msg.status);

  if (error) logError("messaging.status", error);
}

// === Helpers service-level pra Sub-H (automações) — não exigem sessão de usuário ===

/**
 * Envia mensagem outbound numa conversa sem precisar de sessão (Server Action).
 * Usado pelo engine de automações (worker server-side).
 *
 * - Bypassa RLS via service client (worker não tem auth.uid()).
 * - Marca sender_kind='system' (CHECK no schema só aceita contact/user/bot/system).
 * - Dispara o envio via after()/processSendOutbound (mesma trilha da Server Action).
 */
export async function sendMessageToConversation(params: {
  orgId: string;
  conversationId: string;
  text: string;
}): Promise<{ messageId: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      organization_id: params.orgId,
      conversation_id: params.conversationId,
      direction: "outbound",
      sender_kind: "system",
      body: params.text,
      status: "sending",
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      `sendMessageToConversation: ${error?.message ?? "no row"}`,
    );
  }
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId)
    .eq("organization_id", params.orgId);
  after(() =>
    processSendOutbound(data.id).catch((err) =>
      logError("automation.send-outbound", err),
    ),
  );
  return { messageId: data.id };
}

/**
 * Envia template WhatsApp aprovado numa conversa, sem sessão.
 * Espelha o padrão de sendTemplateAction: armazena {name, language, params}
 * em provider_metadata.template — o router resolve no envio.
 */
export async function sendTemplateToConversation(params: {
  orgId: string;
  conversationId: string;
  templateName: string;
  language: string;
  templateParams: Record<string, string>;
}): Promise<{ messageId: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      organization_id: params.orgId,
      conversation_id: params.conversationId,
      direction: "outbound",
      sender_kind: "system",
      body: `[template: ${params.templateName}]`,
      status: "sending",
      provider_metadata: {
        template: {
          name: params.templateName,
          language: params.language,
          params: params.templateParams,
        },
      } as unknown as import("@/types/supabase").Json,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      `sendTemplateToConversation: ${error?.message ?? "no row"}`,
    );
  }
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId)
    .eq("organization_id", params.orgId);
  after(() =>
    processSendOutbound(data.id).catch((err) =>
      logError("automation.send-template-outbound", err),
    ),
  );
  return { messageId: data.id };
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4",
  };
  return map[mime] ?? "bin";
}
