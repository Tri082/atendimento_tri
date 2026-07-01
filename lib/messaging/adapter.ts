/**
 * Interface base que todo canal de mensageria implementa.
 * Adapter = puro tradutor de protocolo (HTTP <-> evento normalizado).
 * NÃO conhece tabelas do CRM — quem grava em DB é o router.
 */

export type ChannelType = "whatsapp_cloud" | "whatsapp_evolution" | "telegram" | "instagram_dm" | "sms" | "mock";

export type MessageStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";

export type MessageDirection = "inbound" | "outbound";

export type SenderKind = "contact" | "user" | "bot" | "system";

export interface ChannelCapabilities {
  templates: boolean;
  reactions: boolean;
  readReceipts: boolean;
  media: boolean;
}

export interface NormalizedMediaAttachment {
  externalMediaId?: string;
  url?: string;
  mimeType: string;
  size?: number;
}

export interface NormalizedEvent {
  kind: "message" | "status" | "reaction";
  externalThreadId: string;
  externalMessageId: string;
  // Nome que o provider externo expõe (pushName no WhatsApp, first_name no
  // Telegram, etc.). Usado pela UI como fallback enquanda o contato não está
  // cadastrado no CRM. Pode não vir em todos os payloads.
  contactName?: string;
  // true quando o evento veio do próprio número/conta conectada (ex:
  // `key.fromMe` no Evolution). Significa que foi outbound — ou o app
  // enviou (eco) ou um humano respondeu direto pelo WhatsApp do celular.
  // Router decide com idempotência via `external_id`.
  fromMe?: boolean;
  timestamp: string; // ISO 8601

  message?: {
    body?: string;
    media?: NormalizedMediaAttachment[];
    replyToExternalId?: string;
  };

  status?: {
    value: "sent" | "delivered" | "read" | "failed";
    failureReason?: string;
  };

  reaction?: {
    emoji: string;
    targetExternalMessageId: string;
  };

  raw: unknown;
}

export interface RemoteTemplate {
  metaId: string;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
  components: unknown[];
  paramCount: number;
}

export interface SendMessageOpts {
  to: string;
  body?: string;
  media?: { url: string; mimeType: string }[];
  replyToExternalId?: string;
}

export interface SendTemplateOpts {
  to: string;
  templateName: string;
  language: string; // ex: "pt_BR"
  params: Record<string, string>;
}

export interface VerifyWebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
  query: Record<string, string | undefined>;
}

export interface MessagingAdapter {
  readonly channel: ChannelType;
  readonly capabilities: ChannelCapabilities;

  validateConfig(config: unknown): { ok: true; config: unknown } | { ok: false; error: string };

  sendMessage(channelConfig: unknown, opts: SendMessageOpts): Promise<{ externalId: string }>;

  sendTemplate(
    channelConfig: unknown,
    opts: SendTemplateOpts,
  ): Promise<{ externalId: string } | { unsupported: true }>;

  verifyWebhook(req: VerifyWebhookRequest, channelConfig?: unknown): boolean;

  parseWebhook(payload: unknown): NormalizedEvent[];

  listTemplates?(channelConfig: unknown): Promise<RemoteTemplate[]>;

  fetchMedia?(
    externalMediaId: string,
    channelConfig: unknown,
  ): Promise<{ data: Buffer; mimeType: string }>;
}
