"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAutomationStatusAction } from "@/lib/automations/actions.server";
import { cn } from "@/lib/utils";

export function ToggleAutomationStatus({
  orgSlug,
  automationId,
  status,
}: {
  orgSlug: string;
  automationId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isActive = status === "active";

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = isActive ? "paused" : "active";
    startTransition(async () => {
      const r = await setAutomationStatusAction({
        orgSlug,
        id: automationId,
        status: next,
      });
      if (!r.ok) {
        toast.error(r.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={isActive ? "Pausar automação" : "Ativar automação"}
      aria-pressed={isActive}
      title={isActive ? "Clique pra pausar" : "Clique pra ativar"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        isActive ? "bg-primary border-primary" : "bg-muted border-border",
        pending && "opacity-50 cursor-wait",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
          isActive ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
