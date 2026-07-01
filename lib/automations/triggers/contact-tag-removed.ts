import { z } from "zod";
import type { TriggerDefinition } from "../schemas";

export const contactTagRemovedTrigger: TriggerDefinition = {
  id: "contact.tag_removed",
  label: "Tag removida de contato",
  description: "Dispara quando uma tag é removida de um contato.",
  contextSchema: z.object({
    entity_id: z.string().uuid(),
    entity_type: z.literal("contact"),
    tag_id: z.string().uuid(),
  }),
  triggerConfigSchema: z.object({
    tag_id: z.string().uuid().optional(),
  }),
  variables: ["{{entity_id}}", "{{tag_id}}", "{{org.name}}", "{{now.iso}}"],
  variableLabels: {
    entity_id: { label: "ID do contato" },
    tag_id: { label: "ID da tag removida" },
  },
  sampleContext: {
    entity_id: "00000000-0000-4000-8000-000000000010",
    entity_type: "contact",
    tag_id: "00000000-0000-4000-8000-000000000020",
  },
};
