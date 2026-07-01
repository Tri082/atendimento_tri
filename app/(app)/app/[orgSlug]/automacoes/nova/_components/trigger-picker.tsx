"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface TriggerLite {
  id: string;
  label: string;
  description: string;
}

export function TriggerPicker({
  triggers,
  onPick,
}: {
  triggers: TriggerLite[];
  onPick: (triggerType: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {triggers.map((t) => (
        <Button
          key={t.id}
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => onPick(t.id))}
          className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal"
        >
          <div className="font-medium">{t.label}</div>
          <p className="text-xs text-muted-foreground">{t.description}</p>
        </Button>
      ))}
    </div>
  );
}
