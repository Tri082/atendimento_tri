import Link from "next/link";
import { PencilIcon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteAutomationButton } from "./delete-automation-button";
import { ToggleAutomationStatus } from "./toggle-automation-status";

export function AutomationCard({
  orgSlug,
  automation,
  triggerLabel,
  metrics,
}: {
  orgSlug: string;
  automation: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
  triggerLabel: string;
  metrics?: {
    total7d: number;
    successRate: number;
    lastRun: string | null;
  };
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors">
      <Link
        href={`/app/${orgSlug}/automacoes/${automation.id}`}
        className="flex items-start gap-3 flex-1 min-w-0"
      >
        <ZapIcon className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="font-medium truncate">{automation.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Quando: {triggerLabel}</div>
          {metrics && metrics.total7d > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {metrics.total7d} runs nos últimos 7d · {metrics.successRate}% sucesso
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <ToggleAutomationStatus
          orgSlug={orgSlug}
          automationId={automation.id}
          status={automation.status}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          render={<Link href={`/app/${orgSlug}/automacoes/${automation.id}`} />}
          nativeButton={false}
          aria-label={`Editar ${automation.name}`}
          className="text-muted-foreground hover:text-foreground"
          title="Editar"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <DeleteAutomationButton
          orgSlug={orgSlug}
          automationId={automation.id}
          name={automation.name}
        />
      </div>
    </div>
  );
}
