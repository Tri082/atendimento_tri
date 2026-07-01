import { render } from "@react-email/render";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "../provider";

/**
 * Adapter "fallback" sem envio real.
 * Loga só metadados (subject + recipient mascarado) — não o corpo do email,
 * que pode conter tokens (R3 era PII vazada em stdout).
 *
 * Em produção, troque EMAIL_PROVIDER=resend.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export class ConsoleAdapter implements EmailProvider {
  async send(opts: SendEmailInput): Promise<SendEmailResult> {
    // Render só para validar o template — não exibe.
    await render(opts.react, { plainText: true });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `📧 [EMAIL FALLBACK] to=${maskEmail(opts.to)} subject="${opts.subject.slice(0, 80)}"`,
      );
    }

    return { ok: true, id: `console-${Date.now()}` };
  }
}
