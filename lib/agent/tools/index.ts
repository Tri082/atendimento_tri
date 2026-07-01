import { tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { makeSearchKbTool } from "./search-kb";
import { makeFindContactTool } from "./find-contact";
import { makeListOpenDealsTool } from "./list-open-deals";
import { makeListPendingTasksTool } from "./list-pending-tasks";
import { makeCreateContactTool } from "./create-contact";
import { makeCreateTaskTool } from "./create-task";
import { makeEscalateTool } from "./escalate";
import { makeApplyTagToConversationTool } from "./apply-tag-to-conversation";

export interface ToolContext {
  orgId: string;
  agentId: string;
  conversationId: string;
  contactId: string | null;
  supabase: SupabaseClient<Database>;
}

export function buildTools(ctx: ToolContext) {
  return {
    search_knowledge_base: makeSearchKbTool(ctx),
    find_contact: makeFindContactTool(ctx),
    list_open_deals: makeListOpenDealsTool(ctx),
    list_pending_tasks: makeListPendingTasksTool(ctx),
    create_contact: makeCreateContactTool(ctx),
    create_task_for_human: makeCreateTaskTool(ctx),
    escalate_to_human: makeEscalateTool(ctx),
    apply_tag_to_conversation: makeApplyTagToConversationTool(ctx),
  };
}

export { tool };
