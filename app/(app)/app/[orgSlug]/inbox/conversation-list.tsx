"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationFilters } from "./conversation-filters";
import { ConversationListItem } from "./conversation-list-item";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Conversation {
  id: string;
  external_thread_id: string;
  display_name: string | null;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  channel: { id: string; type: string; name: string } | null;
  contact: { id: string; name: string; phone: string | null } | null;
  tags?: { tag: Tag | null }[];
  preview?: string | null;
}

interface Props {
  orgSlug: string;
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
}

export function ConversationList({ orgSlug, conversations, selectedId }: Props) {
  const sp = useSearchParams();
  const q = sp.get("q")?.toLowerCase() ?? "";

  const filtered = useMemo(() => {
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.contact?.name ?? ""} ${c.contact?.phone ?? ""} ${c.display_name ?? ""} ${c.external_thread_id} ${c.preview ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, q]);

  return (
    <div className="flex h-full flex-col">
      <ConversationFilters orgSlug={orgSlug} />
      {filtered.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">
          Nenhuma conversa nesses filtros.
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <ConversationListItem
              key={c.id}
              orgSlug={orgSlug}
              c={c}
              selected={c.id === selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
