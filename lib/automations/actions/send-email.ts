import React from "react";
import { z } from "zod";
import { getEmailProvider } from "@/lib/email";
import AutomationTextEmail from "@/lib/email/templates/automation-text";
import type { ActionDefinition } from "../schemas";

const inputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  preview: z.string().max(150).optional(),
  heading: z.string().max(100).optional(),
});
type Input = z.infer<typeof inputSchema>;

export const sendEmailAction: ActionDefinition<Input, { email_id: string }> = {
  id: "send_email",
  label: "Enviar email",
  description:
    "Manda email via provider configurado (Resend em prod, Console em dev).",
  category: "messaging",
  inputSchema,
  async execute(input, _ctx) {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: input.to,
      subject: input.subject,
      react: React.createElement(AutomationTextEmail, {
        preview: input.preview ?? input.subject,
        heading: input.heading,
        body: input.body,
      }),
    });
    if (!result.ok) throw new Error(`send_email: ${result.error}`);
    return { email_id: result.id };
  },
  async simulate(input) {
    return { email_id: `DRY-RUN-email-${input.to}` };
  },
};
