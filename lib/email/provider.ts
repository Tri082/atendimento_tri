import type { ReactElement } from "react";

export type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Interface comum para envio de email transacional.
 * Implementações: lib/email/adapters/*.
 * Seleção via env EMAIL_PROVIDER (ver lib/email/index.ts).
 */
export interface EmailProvider {
  send(opts: SendEmailInput): Promise<SendEmailResult>;
}
