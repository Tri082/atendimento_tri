import type { MessagingAdapter } from "../adapter";
import { MessagingError } from "../errors";
import { registerAdapter } from "../registry";

const NOT_IMPLEMENTED = new MessagingError({
  code: "not_implemented",
  publicMessage: "Conector Telegram ainda não foi implementado.",
  retriable: false,
});

export const telegramAdapter: MessagingAdapter = {
  channel: "telegram",
  capabilities: { templates: false, reactions: false, readReceipts: false, media: true },

  validateConfig: () => ({ ok: false, error: "Telegram ainda não implementado" }),

  sendMessage: async () => {
    throw NOT_IMPLEMENTED;
  },
  sendTemplate: async () => ({ unsupported: true }) as const,
  verifyWebhook: () => false,
  parseWebhook: () => [],
};

registerAdapter(telegramAdapter);
