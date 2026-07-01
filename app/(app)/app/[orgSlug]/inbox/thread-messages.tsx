"use client";

import { useEffect, useRef } from "react";
import { formatDay } from "@/lib/messaging/format/time";
import { groupMessagesByDay } from "@/lib/messaging/format/group";
import { MessageBubble } from "./message-bubble";

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
  messages: Msg[];
}

export function ThreadMessages({ messages }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  type MsgLike = Msg & { sender_kind: "contact" | "user" | "bot" | "system" };
  const groups = groupMessagesByDay(messages as MsgLike[]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {groups.map((g) => (
        <div key={g.dayKey} className="space-y-2">
          <div className="text-center">
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
              {formatDay(g.date)}
            </span>
          </div>
          {g.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </div>
      ))}
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Nenhuma mensagem ainda.
        </div>
      )}
    </div>
  );
}
