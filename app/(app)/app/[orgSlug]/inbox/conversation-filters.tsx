"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TABS = [
  { value: "open", label: "Abertas" },
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
  { value: "", label: "Todas" },
];

interface Props {
  orgSlug: string;
}

export function ConversationFilters({ orgSlug: _orgSlug }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "open";
  const q = sp.get("q") ?? "";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-3 p-3">
      <Input
        value={q}
        onChange={(e) => setParam("q", e.target.value || null)}
        placeholder="Buscar conversa..."
        className="h-8 text-sm"
      />
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = status === t.value || (status === "open" && t.value === "open");
          return (
            <Button
              key={t.value}
              size="sm"
              variant="ghost"
              className={
                active
                  ? "h-7 bg-muted px-2 text-xs font-medium text-foreground hover:bg-muted"
                  : "h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              }
              onClick={() => setParam("status", t.value || null)}
            >
              {t.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
