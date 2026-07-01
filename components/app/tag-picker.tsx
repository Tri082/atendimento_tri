"use client";

import { PlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  applyTagToCompanyAction,
  applyTagToContactAction,
  applyTagToConversationAction,
  applyTagToDealAction,
} from "@/lib/tags/apply";
import type { Tag } from "@/lib/tags/queries";
import type { TagScope } from "@/lib/tags/schemas";

type Props = {
  orgSlug: string;
  entityType: TagScope;
  entityId: string;
  /** Tags do catálogo já filtradas pelo escopo da entidade (filtro feito no Server Component pai) */
  availableTags: Tag[];
  /** Só usado quando entityType === "conversation" */
  conversationContactId?: string | null;
  conversationContactName?: string | null;
};

export function TagPicker({
  orgSlug,
  entityType,
  entityId,
  availableTags,
  conversationContactId,
  conversationContactName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [propagate, setPropagate] = useState(true);
  const [isPending, startTransition] = useTransition();

  const filtered = availableTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApply = (tag: Tag) => {
    startTransition(async () => {
      const baseInput = { orgSlug, tagId: tag.id, entityId };
      const result =
        entityType === "conversation"
          ? await applyTagToConversationAction({
              ...baseInput,
              propagateToContact:
                propagate && !!conversationContactId && tag.appliesTo.includes("contact"),
            })
          : entityType === "contact"
            ? await applyTagToContactAction(baseInput)
            : entityType === "company"
              ? await applyTagToCompanyAction(baseInput)
              : await applyTagToDealAction(baseInput);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSearch("");
      setOpen(false);
    });
  };

  const showPropagationCheckbox =
    entityType === "conversation" && !!conversationContactId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <PlusIcon className="h-3 w-3" /> Tag
          </Button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b border-border/60 p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tag..."
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-muted-foreground text-xs">
              {availableTags.length === 0
                ? "Nenhuma tag disponível pra esse tipo de item."
                : "Nenhuma tag encontrada."}
            </p>
          ) : (
            filtered.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleApply(tag)}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-50"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1" style={{ color: tag.color }}>
                  {tag.name}
                </span>
              </button>
            ))
          )}
        </div>
        {showPropagationCheckbox && (
          <label
            htmlFor="propagate-to-contact"
            className="flex cursor-pointer items-start gap-2 border-t border-border/60 p-2 text-xs"
          >
            <Checkbox
              id="propagate-to-contact"
              checked={propagate}
              onCheckedChange={(v) => setPropagate(v === true)}
            />
            <span className="leading-tight">
              Aplicar também no contato {conversationContactName ?? "vinculado"}
              <span className="block text-muted-foreground text-[10px]">
                Só vale pra tags com escopo "contato".
              </span>
            </span>
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
