"use client";

import { ArrowLeftIcon, BotIcon, CheckCircleIcon, InfoIcon, RotateCcwIcon, UserIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resolveConversationAction } from "@/lib/messaging/conversations/actions";
import {
  pauseAgentForConversationAction,
  resumeAgentForConversationAction,
} from "@/lib/agent/conversation-actions";
import { resolveConversationDisplay } from "./contact-display";

interface Props {
  orgSlug: string;
  conversation: {
    id: string;
    status: string;
    agent_status: string;
    channel_agent_enabled: boolean;
    external_thread_id: string;
    display_name: string | null;
    contact: { name: string; phone: string | null } | null;
    channel: { name: string } | null;
  };
}

export function ThreadHeader({ orgSlug, conversation }: Props) {
  const router = useRouter();
  const isResolved = conversation.status === "resolved";

  async function toggleResolve() {
    const r = await resolveConversationAction({
      orgSlug,
      conversationId: conversation.id,
      resolved: !isResolved,
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(isResolved ? "Conversa reaberta" : "Conversa resolvida");
    router.refresh();
  }

  async function handlePause() {
    const r = await pauseAgentForConversationAction({ orgSlug, conversationId: conversation.id });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Você assumiu a conversa");
    router.refresh();
  }

  async function handleResume() {
    const r = await resumeAgentForConversationAction({ orgSlug, conversationId: conversation.id });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Devolvido pro agente");
    router.refresh();
  }

  const display = resolveConversationDisplay(conversation);

  return (
    <div className="flex items-center gap-3 border-b border-border bg-background p-3">
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        render={<Link href={`/app/${orgSlug}/inbox`} />}
        nativeButton={false}
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Button>
      <Avatar className="h-9 w-9">
        <AvatarFallback>
          {display.initials ?? <UserRoundIcon className="h-4 w-4 text-muted-foreground" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium text-sm">{display.name}</div>
        <div className="text-xs text-muted-foreground">
          {conversation.channel?.name} · {conversation.external_thread_id}
        </div>
      </div>
      <Badge variant={isResolved ? "secondary" : "default"} className="hidden sm:inline-flex">
        {conversation.status}
      </Badge>
      {conversation.channel_agent_enabled && conversation.agent_status === "idle" && (
        <Button variant="outline" size="sm" onClick={handlePause}>
          <UserIcon className="mr-2 h-4 w-4" />
          Assumir
        </Button>
      )}
      {conversation.channel_agent_enabled && conversation.agent_status === "paused_handoff" && (
        <Button variant="outline" size="sm" onClick={handleResume}>
          <BotIcon className="mr-2 h-4 w-4" />
          Devolver pro agente
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={toggleResolve}>
        {isResolved ? (
          <>
            <RotateCcwIcon className="mr-2 h-4 w-4" />
            Reabrir
          </>
        ) : (
          <>
            <CheckCircleIcon className="mr-2 h-4 w-4" />
            Resolver
          </>
        )}
      </Button>
      <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Info">
        <InfoIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
