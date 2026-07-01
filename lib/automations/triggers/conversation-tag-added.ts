import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const conversationTagAddedTrigger: TriggerDefinition = {
  id: "conversation.tag_added",
  label: "Tag adicionada em conversa",
  description: "Dispara quando uma tag é aplicada numa conversa (Inbox).",
  contextSchema: z.object({
    entity_id: z.string().uuid(),
    entity_type: z.literal("conversation"),
    tag_id: z.string().uuid(),
    applied_by_kind: z.enum(["human", "bot", "automation"]),
  }),
  triggerConfigSchema: z.object({
    tag_id: z.string().uuid().optional(),
  }),
  variables: [
    "{{entity_id}}",
    "{{tag_id}}",
    "{{applied_by_kind}}",
    "{{org.name}}",
    "{{now.iso}}",
  ],
  variableLabels: {
    entity_id: { label: "ID da conversa marcada" },
    tag_id: { label: "ID da tag" },
    applied_by_kind: { label: "Quem aplicou", example: "human" },
  },
  sampleContext: {
    entity_id: "00000000-0000-4000-8000-000000000040",
    entity_type: "conversation",
    tag_id: "00000000-0000-4000-8000-000000000020",
    applied_by_kind: "human",
  },
};
