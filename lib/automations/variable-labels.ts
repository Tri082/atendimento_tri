// Importa triggers diretamente em vez de via registry.ts pra evitar puxar
// actions server-only (next/server `after`, node:crypto) pro bundle do
// client. variable-labels é usado pelo Client Component VariablesHelper.
import type { TriggerDefinition } from "./schemas";

import { agentEscalatedTrigger } from "./triggers/agent-escalated";
import { contactCreatedTrigger } from "./triggers/contact-created";
import { contactTagAddedTrigger } from "./triggers/contact-tag-added";
import { contactTagRemovedTrigger } from "./triggers/contact-tag-removed";
import { conversationCreatedTrigger } from "./triggers/conversation-created";
import { conversationTagAddedTrigger } from "./triggers/conversation-tag-added";
import { dealCreatedTrigger } from "./triggers/deal-created";
import { dealStageChangedTrigger } from "./triggers/deal-stage-changed";
import { dealTagAddedTrigger } from "./triggers/deal-tag-added";
import { messageReceivedTrigger } from "./triggers/message-received";
import { taskCompletedTrigger } from "./triggers/task-completed";

const TRIGGERS: Record<string, TriggerDefinition> = {
  "conversation.created": conversationCreatedTrigger,
  "message.received": messageReceivedTrigger,
  "deal.created": dealCreatedTrigger,
  "deal.stage_changed": dealStageChangedTrigger,
  "contact.created": contactCreatedTrigger,
  "task.completed": taskCompletedTrigger,
  "agent.escalated": agentEscalatedTrigger,
  "contact.tag_added": contactTagAddedTrigger,
  "contact.tag_removed": contactTagRemovedTrigger,
  "deal.tag_added": dealTagAddedTrigger,
  "conversation.tag_added": conversationTagAddedTrigger,
};

export interface VariableEntry {
  path: string; // ex.: "{{contact.name}}"
  label: string; // PT-BR
  example?: string;
}

/**
 * Vars sempre disponíveis em qualquer trigger (engine injeta no contexto).
 */
const COMMON_LABELS: Record<string, { label: string; example?: string }> = {
  "org.name": { label: "Nome da sua empresa", example: "Minha Empresa" },
  "org.slug": { label: "Slug da sua empresa", example: "minha-empresa" },
  "now.iso": { label: "Data/hora agora (ISO)", example: "2026-06-04T15:30:00Z" },
  "now.date": { label: "Data de hoje", example: "2026-06-04" },
  "now.time": { label: "Hora atual", example: "15:30" },
};

function stripBraces(path: string): string {
  return path.replace(/^\{\{/, "").replace(/\}\}$/, "");
}

export function listVariablesForTrigger(triggerId: string): VariableEntry[] {
  const trigger = TRIGGERS[triggerId];
  if (!trigger) return [];
  const entries: VariableEntry[] = [];
  for (const path of trigger.variables) {
    const key = stripBraces(path);
    const fromTrigger = trigger.variableLabels?.[key];
    const fromCommon = COMMON_LABELS[key];
    const meta = fromTrigger ?? fromCommon;
    entries.push({
      path,
      label: meta?.label ?? path,
      example: meta?.example,
    });
  }
  // Adicionar vars comuns que o trigger não listou explicitamente.
  for (const [key, meta] of Object.entries(COMMON_LABELS)) {
    const fullPath = `{{${key}}}`;
    if (entries.some((e) => e.path === fullPath)) continue;
    entries.push({ path: fullPath, label: meta.label, example: meta.example });
  }
  return entries;
}

export function getVariableLabel(triggerId: string, path: string): string {
  const entry = listVariablesForTrigger(triggerId).find((e) => e.path === path);
  return entry?.label ?? path;
}
