import { logError } from "@/lib/logger";
import { ResendAdapter } from "./adapters/resend";
import { ConsoleAdapter } from "./adapters/supabase-smtp";
import type { EmailProvider } from "./provider";

let cached: EmailProvider | null = null;

/**
 * Retorna o provider de email configurado.
 *
 * Seleção:
 * 1. Se `EMAIL_PROVIDER=resend` e `RESEND_API_KEY` setado → Resend
 * 2. Caso contrário → Console (loga mas não envia)
 */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const provider = process.env.EMAIL_PROVIDER ?? "supabase";
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Elite da IA - Template <noreply@example.com>";

  if (provider === "resend" && resendKey) {
    cached = new ResendAdapter(resendKey, from);
  } else {
    if (provider === "resend" && !resendKey) {
      logError("email.fallback", new Error("EMAIL_PROVIDER=resend mas RESEND_API_KEY não setada"));
    }
    cached = new ConsoleAdapter();
  }

  return cached;
}

export type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";
