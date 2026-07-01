"use client";

import { SparklesIcon, ZapIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ignoreSuggestionAction } from "@/lib/tags/actions";
import type { TagSuggestion } from "@/lib/tags/queries";
import { TagFormDialog } from "./tag-form-dialog";

type Props = { orgSlug: string; suggestions: TagSuggestion[] };

export function TagSuggestionsSection({ orgSlug, suggestions }: Props) {
  const [promoting, setPromoting] = useState<TagSuggestion | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="flex items-center gap-2 label-mono text-[10px]">
            <SparklesIcon className="h-3 w-3" />
            / sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              orgSlug={orgSlug}
              onPromote={() => setPromoting(s)}
            />
          ))}
        </CardContent>
      </Card>

      {promoting && (
        <TagFormDialog
          orgSlug={orgSlug}
          mode="promote"
          suggestion={{ id: promoting.id, name: promoting.name }}
          onClose={() => setPromoting(null)}
        />
      )}
    </>
  );
}

function SuggestionRow({
  suggestion,
  orgSlug,
  onPromote,
}: {
  suggestion: TagSuggestion;
  orgSlug: string;
  onPromote: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const handleIgnore = () => {
    startTransition(async () => {
      const result = await ignoreSuggestionAction({ orgSlug, suggestionId: suggestion.id });
      if (!result.ok) toast.error(result.error);
      else toast.success("Sugestão ignorada");
    });
  };
  const SourceIcon = suggestion.suggestedBy === "agent" ? SparklesIcon : ZapIcon;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/20 px-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <div className="font-medium text-sm">{suggestion.name}</div>
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <SourceIcon className="h-3 w-3" />
          <span>
            {suggestion.suggestedBy === "agent" ? "Agente IA" : "Automação"} sugeriu{" "}
            {suggestion.occurrences}× · última{" "}
            {new Date(suggestion.lastSeenAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" onClick={onPromote} disabled={isPending}>
          Promover
        </Button>
        <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={isPending}>
          Ignorar
        </Button>
      </div>
    </div>
  );
}
