"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteAutomationAction } from "@/lib/automations/actions.server";

export function DeleteAutomationButton({
  orgSlug,
  automationId,
  name,
}: {
  orgSlug: string;
  automationId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Excluir "${name}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const r = await deleteAutomationAction({ orgSlug, id: automationId });
      if (!r.ok) {
        toast.error(r.error);
      } else {
        toast.success("Automação excluída");
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      onClick={onClick}
      disabled={pending}
      aria-label={`Excluir ${name}`}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2Icon className="h-4 w-4" />
    </Button>
  );
}
