"use client";
import { useState } from "react";
import { BracesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listVariablesForTrigger } from "@/lib/automations/variable-labels";

export function VariablesHelper({
  triggerType,
  onInsert,
}: {
  triggerType: string;
  onInsert: (variable: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const entries = listVariablesForTrigger(triggerType);
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title="Inserir variável"
      >
        <BracesIcon className="h-4 w-4 mr-1" />
        Inserir variável
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-80 max-h-72 overflow-auto rounded-md border border-border bg-card p-2 shadow-md">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 px-2">
            Variáveis disponíveis
          </p>
          <div className="space-y-0.5">
            {entries.map((v) => (
              <button
                key={v.path}
                type="button"
                onClick={() => {
                  onInsert(v.path);
                  setOpen(false);
                }}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-muted"
              >
                <div className="text-sm">{v.label}</div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {v.path}
                  {v.example ? ` — ex: ${v.example}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
