import type { MessagingAdapter } from "../adapter";
import { MessagingError } from "../errors";
import { registerAdapter } from "../registry";

const NOT_IMPLEMENTED = new MessagingError({
  code: "not_implemented",
  publicMessage: "Conector Instagram DM ainda não foi implementado.",
  retriable: false,
});

export const instagramDmAdapter: MessagingAdapter = {
  channel: "instagram_dm",
  capabilities: { templates: false, reactions: true, readReceipts: true, media: true },

  validateConfig: () => ({ ok: false, error: "Instagram DM ainda não implementado" }),

  sendMessage: async () => {
    throw NOT_IMPLEMENTED;
  },
  sendTemplate: async () => ({ unsupported: true }) as const,
  verifyWebhook: () => false,
  parseWebhook: () => [],
};

registerAdapter(instagramDmAdapter);
