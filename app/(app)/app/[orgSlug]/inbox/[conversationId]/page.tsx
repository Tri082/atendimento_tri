import { notFound } from "next/navigation";
import { requireOrgMember } from "@/lib/auth/guards";
import {
  getConversationById,
  getConversationsList,
  getMessagesForConversation,
} from "@/lib/messaging/conversations/queries";
import { markConversationReadAction } from "@/lib/messaging/conversations/actions";
import { ConversationList } from "../conversation-list";
import { ContextPanel } from "../context-panel";
import { InboxShell } from "../inbox-shell";
import { Thread } from "../thread";

interface Props {
  params: Promise<{ orgSlug: string; conversationId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InboxConversationPage({ params, searchParams }: Props) {
  const { orgSlug, conversationId } = await params;
  const sp = await searchParams;
  const { user, org } = await requireOrgMember({ orgSlug });

  const conversation = await getConversationById(org.id, conversationId);
  if (!conversation) notFound();

  const messages = await getMessagesForConversation(conversationId, { limit: 100 });
  const filters = {
    status: (sp.status as "open" | "pending" | "resolved" | undefined) ?? "open",
    channelId: sp.channel,
    assigneeId: sp.assignee,
    tagIds: sp.tags ? sp.tags.split(",") : undefined,
    search: sp.q,
    currentUserId: user.id,
  };
  const { data: conversations } = await getConversationsList(org.id, filters);

  // Mark as read (fire-and-forget — não bloqueia renderização)
  void markConversationReadAction({ orgSlug, conversationId });

  return (
    <InboxShell orgId={org.id} currentConversationId={conversationId}>
      <div className="-mx-6 -mb-24 -mt-6 grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[20rem_1fr] lg:grid-cols-[20rem_1fr_18rem]">
        <aside className="hidden overflow-y-auto border-r border-border md:block">
          <ConversationList
            orgSlug={orgSlug}
            conversations={conversations}
            selectedId={conversationId}
            currentUserId={user.id}
          />
        </aside>
        <main className="flex min-h-0 flex-col">
          <Thread
            orgSlug={orgSlug}
            conversation={conversation}
            messages={messages}
            currentUserId={user.id}
          />
        </main>
        <aside className="hidden overflow-y-auto border-l border-border lg:block">
          <ContextPanel orgSlug={orgSlug} conversation={conversation} />
        </aside>
      </div>
    </InboxShell>
  );
}
