"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { retryRunAction } from "@/lib/automations/actions.server";

export function RetryButton({
  orgSlug,
  runId,
}: {
  orgSlug: string;
  runId: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryRunAction({ orgSlug, runId });
          if (r.ok) router.refresh();
          else alert(r.error);
        })
      }
    >
      <RotateCcwIcon className="h-4 w-4 mr-1" /> Re-executar
    </Button>
  );
}
