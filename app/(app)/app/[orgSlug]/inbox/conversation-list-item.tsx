"use client";

import { UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMessageTime } from "@/lib/messaging/format/time";
import { cn } from "@/lib/utils";
import { resolveConversationDisplay } from "./contact-display";

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
  c: Conversation;
  selected: boolean;
}

export function ConversationListItem({ orgSlug, c, selected }: Props) {
  const display = resolveConversationDisplay(c);
  const tags = (c.tags ?? []).map((t) => t.tag).filter((t): t is Tag => t !== null);

  return (
    <Link
      href={`/app/${orgSlug}/inbox/${c.id}`}
      className={cn(
        "flex gap-3 border-b border-border/60 border-l-2 p-3 transition-colors",
        selected
          ? "border-l-primary bg-muted"
          : "border-l-transparent hover:bg-muted/50",
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback>
          {display.initials ?? <UserIcon className="h-4 w-4 text-muted-foreground" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-sm">{display.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatMessageTime(c.last_message_at)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {c.channel?.name} · {c.status}
        </div>
        {c.preview && (
          <div className="mt-1 text-xs text-muted-foreground truncate">{c.preview}</div>
        )}
        {(tags.length > 0 || c.unread_count > 0) && (
          <div className="mt-2 flex items-center gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: t.color, color: "white" }}
              >
                {t.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
            )}
            {c.unread_count > 0 && (
              <Badge variant="default" className="ml-auto h-5 px-1.5 text-[10px]">
                {c.unread_count}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
