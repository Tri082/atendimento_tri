import { z } from "zod";
import { sendTemplateToConversation } from "@/lib/messaging/router";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
  template_name: z.string().min(1).max(200),
  language: z.string().min(2).max(10),
  template_params: z.record(z.string(), z.string()).default({}),
});
type Input = z.infer<typeof inputSchema>;

export const sendWhatsappTemplateAction: ActionDefinition<
  Input,
  { message_id: string }
> = {
  id: "send_whatsapp_template",
  label: "Enviar template no WhatsApp",
  description:
    "Manda um template WhatsApp aprovado pela Meta. Use pra iniciar conversa fora da janela de 24h.",
  category: "messaging",
  inputSchema,
  async execute(input, ctx) {
    // Sub-H C-2: org isolation
    const supabase = createServiceClient();
    await assertOrgOwns(
      supabase,
      "conversations",
      input.conversation_id,
      ctx.orgId,
      "send_whatsapp_template",
    );
    const result = await sendTemplateToConversation({
      orgId: ctx.orgId,
      conversationId: input.conversation_id,
      templateName: input.template_name,
      language: input.language,
      templateParams: input.template_params,
    });
    return { message_id: result.messageId };
  },
  async simulate(input) {
    return {
      message_id: `DRY-RUN-template-${input.template_name}-${input.conversation_id.slice(0, 8)}`,
    };
  },
};
