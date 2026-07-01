import type { MessagingAdapter } from "../adapter";
import { MessagingError } from "../errors";
import { registerAdapter } from "../registry";

const NOT_IMPLEMENTED = new MessagingError({
  code: "not_implemented",
  publicMessage: "Conector SMS ainda não foi implementado.",
  retriable: false,
});

export const smsAdapter: MessagingAdapter = {
  channel: "sms",
  capabilities: { templates: false, reactions: false, readReceipts: false, media: false },

  validateConfig: () => ({ ok: false, error: "SMS ainda não implementado" }),

  sendMessage: async () => {
    throw NOT_IMPLEMENTED;
  },
  sendTemplate: async () => ({ unsupported: true }) as const,
  verifyWebhook: () => false,
  parseWebhook: () => [],
};

registerAdapter(smsAdapter);
