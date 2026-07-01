import type { ActionDefinition, TriggerDefinition } from "./schemas";

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

import { addTagToConversationAction } from "./actions/add-tag-to-conversation";
import { applyTagToCompanyAction } from "./actions/apply-tag-to-company";
import { applyTagToContactAction } from "./actions/apply-tag-to-contact";
import { applyTagToDealAction } from "./actions/apply-tag-to-deal";
import { assignOwnerAction } from "./actions/assign-owner";
import { callWebhookAction } from "./actions/call-webhook";
import { createContactAction } from "./actions/create-contact";
import { createDealAction } from "./actions/create-deal";
import { createTaskAction } from "./actions/create-task";
import { escalateToHumanAction } from "./actions/escalate-to-human";
import { pauseAgentOnConversationAction } from "./actions/pause-agent-on-conversation";
import { removeTagFromCompanyAction } from "./actions/remove-tag-from-company";
import { removeTagFromContactAction } from "./actions/remove-tag-from-contact";
import { removeTagFromConversationAction } from "./actions/remove-tag-from-conversation";
import { removeTagFromDealAction } from "./actions/remove-tag-from-deal";
import { sendEmailAction } from "./actions/send-email";
import { sendWhatsappMessageAction } from "./actions/send-whatsapp-message";
import { sendWhatsappTemplateAction } from "./actions/send-whatsapp-template";
import { updateContactAction } from "./actions/update-contact";
import { updateDealFieldsAction } from "./actions/update-deal-fields";
import { updateDealStageAction } from "./actions/update-deal-stage";

// ============================================================
// Registry — fonte única dos triggers e actions do MVP
// ============================================================

export const TRIGGERS: Record<string, TriggerDefinition> = {
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

// Variance: ActionDefinition<TInput,TOutput> é contravariante em TInput (execute(input)),
// então ActionDefinition<Specific,...> não widens pra ActionDefinition<unknown,...>.
// O cast é seguro porque o engine valida o input via Zod (`action.inputSchema.safeParse`)
// antes de chamar execute — runtime garante o tipo que TS estático não consegue inferir.
// Actions devem ser side-effect-free no module load (apenas object literals).
export const ACTIONS: Record<string, ActionDefinition> = {
  create_contact: createContactAction as unknown as ActionDefinition,
  update_contact: updateContactAction as unknown as ActionDefinition,
  create_deal: createDealAction as unknown as ActionDefinition,
  update_deal_stage: updateDealStageAction as unknown as ActionDefinition,
  update_deal_fields: updateDealFieldsAction as unknown as ActionDefinition,
  create_task: createTaskAction as unknown as ActionDefinition,
  send_whatsapp_message: sendWhatsappMessageAction as unknown as ActionDefinition,
  send_whatsapp_template:
    sendWhatsappTemplateAction as unknown as ActionDefinition,
  send_email: sendEmailAction as unknown as ActionDefinition,
  assign_owner: assignOwnerAction as unknown as ActionDefinition,
  add_tag_to_conversation:
    addTagToConversationAction as unknown as ActionDefinition,
  apply_tag_to_contact: applyTagToContactAction as unknown as ActionDefinition,
  apply_tag_to_company: applyTagToCompanyAction as unknown as ActionDefinition,
  apply_tag_to_deal: applyTagToDealAction as unknown as ActionDefinition,
  remove_tag_from_conversation:
    removeTagFromConversationAction as unknown as ActionDefinition,
  remove_tag_from_contact:
    removeTagFromContactAction as unknown as ActionDefinition,
  remove_tag_from_company:
    removeTagFromCompanyAction as unknown as ActionDefinition,
  remove_tag_from_deal: removeTagFromDealAction as unknown as ActionDefinition,
  pause_agent_on_conversation:
    pauseAgentOnConversationAction as unknown as ActionDefinition,
  escalate_to_human: escalateToHumanAction as unknown as ActionDefinition,
  call_webhook: callWebhookAction as unknown as ActionDefinition,
};

export function listTriggers(): TriggerDefinition[] {
  return Object.values(TRIGGERS);
}
export function listActions(): ActionDefinition[] {
  return Object.values(ACTIONS);
}
export function getTrigger(id: string): TriggerDefinition | undefined {
  return TRIGGERS[id];
}
export function getAction(id: string): ActionDefinition | undefined {
  return ACTIONS[id];
}
