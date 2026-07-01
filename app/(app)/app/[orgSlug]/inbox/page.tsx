import { requireOrgMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getConversationsList } from "@/lib/messaging/conversations/queries";
import { EmptyState } from "./empty-state";
import { InboxShell } from "./inbox-shell";
import { ConversationList } from "./conversation-list";

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { user, org } = await requireOrgMember({ orgSlug });

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id")
    .eq("organization_id", org.id);

  if (!channels || channels.length === 0) {
    return <EmptyState orgSlug={orgSlug} />;
  }

  const filters = parseFilters(sp, user.id);
  const { data: conversations } = await getConversationsList(org.id, filters);

  return (
    <InboxShell orgId={org.id} currentConversationId={null}>
      <div className="-mx-6 -mb-24 -mt-6 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[20rem_1fr_18rem]">
        <aside className="overflow-y-auto border-r border-border">
          <ConversationList
            orgSlug={orgSlug}
            conversations={conversations}
            selectedId={null}
            currentUserId={user.id}
          />
        </aside>
        <main className="flex items-center justify-center text-muted-foreground">
          Selecione uma conversa pra começar
        </main>
        <aside className="hidden border-l border-border lg:block" />
      </div>
    </InboxShell>
  );
}

function parseFilters(sp: Record<string, string | undefined>, userId: string) {
  return {
    status: (sp.status as "open" | "pending" | "resolved" | undefined) ?? "open",
    channelId: sp.channel,
    assigneeId: sp.assignee,
    tagIds: sp.tags ? sp.tags.split(",") : undefined,
    search: sp.q,
    currentUserId: userId,
  };
}
