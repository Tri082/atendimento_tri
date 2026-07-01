import { getApprovedTemplatesByChannel } from "@/lib/messaging/templates/queries";
import { AgentStatusIndicator } from "./agent-status-indicator";
import { Composer } from "./composer";
import { ThreadHeader } from "./thread-header";
import { ThreadMessages } from "./thread-messages";

interface Msg {
  id: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  direction: string;
  status: string;
  created_at: string;
  failure_reason: string | null;
  sender_kind: string;
  sender_user_id: string | null;
}

interface Props {
  orgSlug: string;
  conversation: {
    id: string;
    status: string;
    agent_status: string;
    external_thread_id: string;
    display_name: string | null;
    last_inbound_at: string | null;
    channel_id: string;
    contact: { name: string; phone: string | null } | null;
    channel: {
      type: string;
      name: string;
      agent_id: string | null;
      agent: { id: string; name: string; is_active: boolean } | null;
    } | null;
  };
  messages: Msg[];
  currentUserId: string;
}

export async function Thread({ orgSlug, conversation, messages }: Props) {
  const templates = await getApprovedTemplatesByChannel(conversation.channel_id);
  return (
    <div className="flex h-full flex-col min-h-0">
      <AgentStatusIndicator
        status={conversation.agent_status as "idle" | "thinking" | "paused_handoff"}
        agentName={conversation.channel?.agent?.name ?? null}
      />
      <ThreadHeader
        orgSlug={orgSlug}
        conversation={{
          ...conversation,
          channel_agent_enabled: Boolean(conversation.channel?.agent_id && conversation.channel.agent?.is_active),
        }}
      />
      <ThreadMessages messages={messages} />
      <Composer
        orgSlug={orgSlug}
        conversationId={conversation.id}
        channelId={conversation.channel_id}
        channelType={conversation.channel?.type ?? ""}
        lastInboundAt={conversation.last_inbound_at}
        templates={templates}
      />
    </div>
  );
}
