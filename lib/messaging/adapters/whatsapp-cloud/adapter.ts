import crypto from "node:crypto";
import type {
  MessagingAdapter,
  NormalizedEvent,
  RemoteTemplate,
  SendMessageOpts,
  SendTemplateOpts,
  VerifyWebhookRequest,
} from "@/lib/messaging/adapter";
import { MessagingError } from "@/lib/messaging/errors";
import { graphFetch, graphFetchBinary } from "./client";
import { toRemoteTemplate } from "./extract-message";
import { parseWebhook } from "./parse-webhook";
import { whatsappCloudConfigSchema, type WhatsappCloudConfig } from "./schema";

function parseCfg(config: unknown): WhatsappCloudConfig {
  return whatsappCloudConfigSchema.parse(config);
}

function getHeader(headers: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = headers[key.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export const whatsappCloudAdapter: MessagingAdapter = {
  channel: "whatsapp_cloud",
  capabilities: { templates: true, reactions: true, readReceipts: true, media: true },

  validateConfig(config) {
    const r = whatsappCloudConfigSchema.safeParse(config);
    if (!r.success) {
      return { ok: false, error: r.error.issues[0]?.message ?? "Config inválida" };
    }
    return { ok: true, config: r.data };
  },

  async sendMessage(config: unknown, opts: SendMessageOpts): Promise<{ externalId: string }> {
    const cfg = parseCfg(config);
    const to = opts.to.replace(/^\+/, "");

    let body: Record<string, unknown>;
    const m = opts.media?.[0];
    if (m) {
      const isImage = m.mimeType.startsWith("image/");
      const kind = isImage ? "image" : "document";
      const filename = !isImage ? extractFilenameFromUrl(m.url) : undefined;
      body = {
        messaging_product: "whatsapp",
        to,
        type: kind,
        [kind]: {
          link: m.url,
          ...(opts.body ? { caption: opts.body } : {}),
          ...(filename ? { filename } : {}),
        },
      };
    } else {
      body = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: opts.body, preview_url: false },
      };
    }

    const data = await graphFetch<{ messages: { id: string }[] }>(
      cfg,
      `/${cfg.phoneNumberId}/messages`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const id = data.messages[0]?.id;
    if (!id) throw new MessagingError({ code: "unknown", publicMessage: "Resposta inesperada da API do WhatsApp", retriable: false });
    return { externalId: id };
  },

  async sendTemplate(config: unknown, opts: SendTemplateOpts) {
    const cfg = parseCfg(config);
    const to = opts.to.replace(/^\+/, "");
    const paramValues = Object.values(opts.params).map((v) => ({ type: "text", text: v }));

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: opts.templateName,
        language: { code: opts.language },
        components: paramValues.length > 0
          ? [{ type: "body", parameters: paramValues }]
          : [],
      },
    };

    const data = await graphFetch<{ messages: { id: string }[] }>(
      cfg,
      `/${cfg.phoneNumberId}/messages`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const id = data.messages[0]?.id;
    if (!id) throw new MessagingError({ code: "unknown", publicMessage: "Resposta inesperada da API do WhatsApp", retriable: false });
    return { externalId: id };
  },

  verifyWebhook(req: VerifyWebhookRequest, channelConfig?: unknown): boolean {
    if (!channelConfig) return false;
    const cfg = whatsappCloudConfigSchema.safeParse(channelConfig);
    if (!cfg.success) return false;

    const sig = getHeader(req.headers, "x-hub-signature-256");
    if (!sig) return false;

    const expected =
      "sha256=" +
      crypto.createHmac("sha256", cfg.data.appSecret).update(req.rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  },

  parseWebhook,

  async listTemplates(config: unknown): Promise<RemoteTemplate[]> {
    const cfg = parseCfg(config);
    const collected: RemoteTemplate[] = [];
    let path: string | null = `/${cfg.wabaId}/message_templates?limit=100`;

    while (path && collected.length < 200) {
      const data: { data: unknown[]; paging?: { next?: string } } = await graphFetch(cfg, path);
      for (const raw of data.data) {
        collected.push(toRemoteTemplate(raw as never));
      }
      if (data.paging?.next) {
        const u = new URL(data.paging.next);
        path = `${u.pathname}${u.search}`;
      } else {
        path = null;
      }
    }
    return collected;
  },

  async fetchMedia(externalMediaId: string, config: unknown) {
    const cfg = parseCfg(config);
    const meta = await graphFetch<{ url: string; mime_type: string }>(
      cfg,
      `/${externalMediaId}`,
    );
    return graphFetchBinary(cfg, meta.url);
  },
};

function extractFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() ?? "arquivo";
    return decodeURIComponent(last);
  } catch {
    return "arquivo";
  }
}
