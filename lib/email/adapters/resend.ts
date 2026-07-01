import { render } from "@react-email/render";
import { Resend } from "resend";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "../provider";

export class ResendAdapter implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(opts: SendEmailInput): Promise<SendEmailResult> {
    try {
      const html = await render(opts.react);
      const text = await render(opts.react, { plainText: true });
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html,
        text,
        replyTo: opts.replyTo,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id ?? "" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }
}
