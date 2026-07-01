"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleAgentActiveAction } from "@/lib/agent/agents/actions";
import type { AgentListRow } from "@/lib/agent/agents/queries";

export function AgentRowActions({ orgSlug, agent }: { orgSlug: string; agent: AgentListRow }) {
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/app/${orgSlug}/settings/agents/${agent.id}`} />}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await toggleAgentActiveAction({
                orgSlug,
                agentId: agent.id,
                is_active: !agent.is_active,
              });
              if (!r.ok) toast.error(r.error);
              else toast.success(agent.is_active ? "Agente pausado." : "Agente ativado.");
            })
          }
        >
          {agent.is_active ? "Pausar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href={`/app/${orgSlug}/settings/agents/${agent.id}?tab=config#delete`} />}
          className="text-destructive"
        >
          Apagar…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
