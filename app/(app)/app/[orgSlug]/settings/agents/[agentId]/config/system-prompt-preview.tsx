"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { buildSystemPrompt, type PromptSettings } from "@/lib/agent/prompts/build";

export function SystemPromptPreview({ settings }: { settings: Omit<PromptSettings, "company_name"> & { company_name: string | null | undefined } }) {
  const [open, setOpen] = useState(false);

  const normalized: PromptSettings = {
    agent_name: settings.agent_name,
    company_name: settings.company_name || null,
    persona: settings.persona ?? null,
    goal: settings.goal ?? null,
    tone: settings.tone,
    never_do: settings.never_do ?? null,
  };

  const preview = buildSystemPrompt(normalized, "");

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        {open ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        Ver prompt completo (o que vai pro modelo)
      </button>
      {open && (
        <pre className="border-t border-border bg-background/50 p-4 text-xs whitespace-pre-wrap font-mono">
          {preview}
        </pre>
      )}
    </div>
  );
}
