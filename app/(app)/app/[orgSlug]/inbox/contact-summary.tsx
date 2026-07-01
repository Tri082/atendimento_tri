import { UserRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { resolveConversationDisplay } from "./contact-display";

interface Props {
  conversation: {
    external_thread_id: string;
    display_name: string | null;
    contact: { name: string; email: string | null; phone: string | null } | null;
  };
}

export function ContactSummary({ conversation }: Props) {
  const display = resolveConversationDisplay(conversation);
  const subtitle =
    conversation.contact?.phone ?? conversation.external_thread_id;
  return (
    <div className="space-y-2 p-4 text-center">
      <Avatar className="mx-auto h-16 w-16">
        <AvatarFallback className="text-lg">
          {display.initials ?? <UserRoundIcon className="h-6 w-6 text-muted-foreground" />}
        </AvatarFallback>
      </Avatar>
      <div className="font-medium">
        {display.hasRealName ? display.name : "Contato não identificado"}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
      {conversation.contact?.email && (
        <div className="text-xs text-muted-foreground">{conversation.contact.email}</div>
      )}
    </div>
  );
}
