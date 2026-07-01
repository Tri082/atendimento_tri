import { SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/messaging/format/time";
import { MessageMedia } from "./message-media";
import { MessageStatusIcon } from "./message-status-icon";

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
}

interface Props {
  msg: Msg;
}

export function MessageBubble({ msg }: Props) {
  const isOut = msg.direction === "outbound";
  const isBot = msg.sender_kind === "bot";
  return (
    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] space-y-1 rounded-lg px-3 py-2 text-sm",
          isOut && isBot
            ? "bg-primary/5 border border-primary/20"
            : isOut
              ? "bg-primary/10"
              : "bg-muted",
        )}
      >
        {isBot && (
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <SparklesIcon className="h-3 w-3" />
            <span>Agente</span>
          </div>
        )}
        {msg.media_url && msg.media_type && (
          <MessageMedia mediaUrl={msg.media_url} mediaType={msg.media_type} />
        )}
        {msg.body && <div className="whitespace-pre-wrap">{msg.body}</div>}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <span>{formatMessageTime(msg.created_at)}</span>
          {isOut && <MessageStatusIcon status={msg.status} />}
        </div>
        {msg.status === "failed" && msg.failure_reason && (
          <div className="text-[10px] text-destructive">{msg.failure_reason}</div>
        )}
      </div>
    </div>
  );
}
