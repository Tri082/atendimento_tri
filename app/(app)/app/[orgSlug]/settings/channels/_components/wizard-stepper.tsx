"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepDef = { id: number; label: string };

export function WizardStepper({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary",
                !active && !done && "border-muted bg-muted/30 text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="h-3 w-3" /> : s.id}
            </div>
            <span
              className={cn(
                "text-xs",
                active && "font-medium text-foreground",
                !active && "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-4 bg-muted" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
