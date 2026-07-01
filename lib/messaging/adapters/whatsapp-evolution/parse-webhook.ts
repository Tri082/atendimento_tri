import type { NormalizedEvent, NormalizedMediaAttachment } from "@/lib/messaging/adapter";
import { isoFromUnixSeconds, jidToPhone } from "./extract-message";

type Payload = {
  event?: string;
  instance?: string;
  data?: Record<string, unknown>;
};

const MEDIA_TYPES = new Set([
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "documentMessage",
  "stickerMessage",
]);

function extractMessageContent(
  messageType: string | undefined,
  message: Record<string, unknown> | undefined,
): { body?: string; media?: NormalizedMediaAttachment[]; mimeType?: string } {
  if (!message) return {};
  if (messageType === "conversation") {
    return { body: typeof message.conversation === "string" ? message.conversation : undefined };
  }
  if (messageType === "extendedTextMessage") {
    const ext = message.extendedTextMessage as Record<string, unknown> | undefined;
    return { body: typeof ext?.text === "string" ? ext.text : undefined };
  }
  if (messageType && MEDIA_TYPES.has(messageType)) {
    const m = message[messageType] as Record<string, unknown> | undefined;
    const mimeType = typeof m?.mimetype === "string" ? m.mimetype : "application/octet-stream";
    const caption = typeof m?.caption === "string" ? m.caption : undefined;
    return { body: caption, mimeType };
  }
  return {};
}

function parseMessageUpsert(payload: Payload): NormalizedEvent[] {
  const data = payload.data ?? {};
  const key = data.key as Record<string, unknown> | undefined;
  const remoteJid = typeof key?.remoteJid === "string" ? key.remoteJid : null;
  const externalMessageId = typeof key?.id === "string" ? key.id : null;
  const fromMe = key?.fromMe === true;
  if (!remoteJid || !externalMessageId) return [];
  // Nota: NÃO filtramos fromMe aqui. Quando o app envia, o INSERT no router
  // colide com a UNIQUE(conversation_id, external_id) e é silenciosamente
  // ignorado (idempotência). Quando o humano responde pelo WhatsApp do
  // próprio celular, o webhook também vem com fromMe=true e a gente
  // registra como outbound — caso contrário a mensagem some da inbox.

  const messageType = typeof data.messageType === "string" ? data.messageType : undefined;
  const message = data.message as Record<string, unknown> | undefined;
  const timestamp = typeof data.messageTimestamp === "number" ? data.messageTimestamp : 0;
  const pushName =
    typeof data.pushName === "string" && data.pushName.trim().length > 0
      ? data.pushName.trim()
      : undefined;

  const extracted = extractMessageContent(messageType, message);
  const media: NormalizedMediaAttachment[] | undefined = extracted.mimeType
    ? [{ externalMediaId: externalMessageId, mimeType: extracted.mimeType }]
    : undefined;

  return [
    {
      kind: "message",
      externalThreadId: jidToPhone(remoteJid),
      externalMessageId,
      contactName: pushName,
      fromMe,
      timestamp: isoFromUnixSeconds(timestamp),
      message: {
        body: extracted.body,
        media,
      },
      raw: { instanceName: payload.instance, ...payload },
    },
  ];
}

function parseMessageUpdate(payload: Payload): NormalizedEvent[] {
  const data = payload.data ?? {};
  const keyId = typeof data.keyId === "string" ? data.keyId : null;
  const remoteJid = typeof data.remoteJid === "string" ? data.remoteJid : "";
  const status = typeof data.status === "number" ? data.status : null;
  if (!keyId || status === null) return [];

  let value: "sent" | "delivered" | "read" | "failed";
  if (status === 2) value = "delivered";
  else if (status === 3) value = "read";
  else if (status >= 4) value = "failed";
  else value = "sent";

  return [
    {
      kind: "status",
      externalThreadId: remoteJid ? jidToPhone(remoteJid) : "",
      externalMessageId: keyId,
      timestamp: new Date().toISOString(),
      status: { value },
      raw: { instanceName: payload.instance, ...payload },
    },
  ];
}

export function parseWebhook(payload: unknown): NormalizedEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Payload;
  if (!p.event) return [];

  switch (p.event) {
    case "messages.upsert":
      return parseMessageUpsert(p);
    case "messages.update":
      return parseMessageUpdate(p);
    default:
      return [];
  }
}
