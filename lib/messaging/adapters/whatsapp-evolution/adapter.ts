import type {
  MessagingAdapter,
  SendMessageOpts,
  SendTemplateOpts,
  VerifyWebhookRequest,
} from "@/lib/messaging/adapter";
import { postJson } from "./client";
import { extractFilename, mimeToMediaType, stripPlus } from "./extract-message";
import { parseWebhook } from "./parse-webhook";
import { evolutionConfigSchema, type EvolutionConfig } from "./schema";
import { verifyBearer } from "./verify-webhook";

function parseCfg(config: unknown): EvolutionConfig {
  return evolutionConfigSchema.parse(config);
}

function getAuthHeader(
  headers: Record<string, string | string[] | undefined>,
): string | string[] | undefined {
  return headers.authorization ?? headers.Authorization;
}

export const evolutionAdapter: MessagingAdapter = {
  channel: "whatsapp_evolution",
  capabilities: {
    templates: false,
    reactions: true,
    readReceipts: true,
    media: true,
  },

  validateConfig(config) {
    const r = evolutionConfigSchema.safeParse(config);
    if (!r.success) {
      return { ok: false, error: r.error.issues[0]?.message ?? "Config inválida" };
    }
    return { ok: true, config: r.data };
  },

  async sendMessage(config: unknown, opts: SendMessageOpts): Promise<{ externalId: string }> {
    const cfg = parseCfg(config);
    const to = stripPlus(opts.to);

    // Sem mídia → sendText
    if (!opts.media || opts.media.length === 0) {
      const res = await postJson<{ key: { id: string } }>(
        `${cfg.baseUrl}/message/sendText/${cfg.instanceName}`,
        cfg.apiKey,
        {
          number: to,
          text: opts.body ?? "",
          ...(opts.replyToExternalId
            ? { quoted: { key: { id: opts.replyToExternalId } } }
            : {}),
        },
      );
      return { externalId: res.key.id };
    }

    // Mídia: Evolution v2 aceita 1 por request — primeira com caption=body, resto sem caption
    let firstId: string | null = null;
    for (let i = 0; i < opts.media.length; i++) {
      const m = opts.media[i]!;
      const res = await postJson<{ key: { id: string } }>(
        `${cfg.baseUrl}/message/sendMedia/${cfg.instanceName}`,
        cfg.apiKey,
        {
          number: to,
          mediatype: mimeToMediaType(m.mimeType),
          mimetype: m.mimeType,
          caption: i === 0 ? (opts.body ?? "") : "",
          media: m.url,
          fileName: extractFilename(m.url) ?? "arquivo",
        },
      );
      if (i === 0) firstId = res.key.id;
    }
    if (!firstId) throw new Error("Falha ao enviar mídia.");
    return { externalId: firstId };
  },

  async sendTemplate(_config: unknown, _opts: SendTemplateOpts) {
    return { unsupported: true };
  },

  verifyWebhook(req: VerifyWebhookRequest, channelConfig?: unknown): boolean {
    if (!channelConfig) return false;
    const cfg = evolutionConfigSchema.safeParse(channelConfig);
    if (!cfg.success) return false;
    const auth = getAuthHeader(req.headers);
    return verifyBearer(auth, cfg.data.webhookSecret);
  },

  parseWebhook,

  async fetchMedia(externalMediaId: string, config: unknown) {
    const cfg = parseCfg(config);
    const res = await postJson<{ base64: string; mimetype: string }>(
      `${cfg.baseUrl}/chat/getBase64FromMediaMessage/${cfg.instanceName}`,
      cfg.apiKey,
      { message: { key: { id: externalMediaId } } },
    );
    return {
      data: Buffer.from(res.base64, "base64"),
      mimeType: res.mimetype ?? "application/octet-stream",
    };
  },
};
