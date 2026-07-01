// app/(app)/app/[orgSlug]/automacoes/[automationId]/_components/variable-inserter.tsx
"use client";
import { useState } from "react";
import { BracesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listVariablesForTrigger } from "@/lib/automations/variable-labels";

export function VariableInserter({
  triggerType,
  onPick,
}: {
  triggerType: string;
  onPick: (variable: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const entries = listVariablesForTrigger(triggerType);
  if (entries.length === 0) return null;
  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setOpen((o) => !o)}
        aria-label="Inserir variável neste campo"
        title="Inserir variável"
      >
        <BracesIcon className="h-3 w-3 mr-1" />
        Variável
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-72 max-h-64 overflow-auto rounded-md border border-border bg-card shadow-md">
          <ul className="p-1">
            {entries.map((v) => (
              <li key={v.path}>
                <button
                  type="button"
                  className="block w-full text-left px-2 py-1.5 rounded hover:bg-muted"
                  onClick={() => {
                    onPick(v.path);
                    setOpen(false);
                  }}
                >
                  <div className="text-sm">{v.label}</div>
                  {v.example && (
                    <div className="text-[10px] text-muted-foreground">
                      ex: {v.example}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
