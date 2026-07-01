import { z } from "zod";
import { sendMessageToConversation } from "@/lib/messaging/router";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionDefinition } from "../schemas";
import { assertOrgOwns } from "./_org-isolation";

const inputSchema = z.object({
  conversation_id: z.string().uuid(),
  text: z.string().min(1).max(4000),
});
type Input = z.infer<typeof inputSchema>;

export const sendWhatsappMessageAction: ActionDefinition<
  Input,
  { message_id: string }
> = {
  id: "send_whatsapp_message",
  label: "Enviar mensagem no WhatsApp",
  description:
    "Manda texto livre na conversa. Respeita a janela de 24h do WhatsApp Cloud (se passou, use um template).",
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
      "send_whatsapp_message",
    );
    const result = await sendMessageToConversation({
      orgId: ctx.orgId,
      conversationId: input.conversation_id,
      text: input.text,
    });
    return { message_id: result.messageId };
  },
  async simulate(input) {
    return {
      message_id: `DRY-RUN-msg-${input.conversation_id.slice(0, 8)}`,
    };
  },
};
