import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const dealTagAddedTrigger: TriggerDefinition = {
  id: "deal.tag_added",
  label: "Tag adicionada em deal",
  description: "Dispara quando uma tag é aplicada num deal.",
  contextSchema: z.object({
    entity_id: z.string().uuid(),
    entity_type: z.literal("deal"),
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
    entity_id: { label: "ID do deal marcado" },
    tag_id: { label: "ID da tag" },
    applied_by_kind: { label: "Quem aplicou", example: "human" },
  },
  sampleContext: {
    entity_id: "00000000-0000-4000-8000-000000000030",
    entity_type: "deal",
    tag_id: "00000000-0000-4000-8000-000000000020",
    applied_by_kind: "human",
  },
};
