"use client";

import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTagAction } from "@/lib/tags/actions";
import type { TagWithUsage } from "@/lib/tags/queries";
import type { TagScope } from "@/lib/tags/schemas";
import { TagFormDialog } from "./tag-form-dialog";

type Props = { orgSlug: string; tags: TagWithUsage[] };

const SCOPE_LABELS: Record<TagScope, string> = {
  conversation: "conversa",
  contact: "contato",
  company: "empresa",
  deal: "deal",
};

function summarizeUsage(t: TagWithUsage): string {
  const parts: string[] = [];
  if (t.usage.contact > 0) parts.push(`${t.usage.contact} contato${t.usage.contact > 1 ? "s" : ""}`);
  if (t.usage.company > 0) parts.push(`${t.usage.company} empresa${t.usage.company > 1 ? "s" : ""}`);
  if (t.usage.deal > 0) parts.push(`${t.usage.deal} deal${t.usage.deal > 1 ? "s" : ""}`);
  if (t.usage.conversation > 0) {
    parts.push(`${t.usage.conversation} conversa${t.usage.conversation > 1 ? "s" : ""}`);
  }
  return parts.length === 0 ? "sem uso" : parts.join(" · ");
}

export function TagsTable({ orgSlug, tags }: Props) {
  const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!deletingTag) return;
    startTransition(async () => {
      const result = await deleteTagAction({ orgSlug, id: deletingTag.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tag removida");
      setDeletingTag(null);
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">
            / {tags.length} tag{tags.length === 1 ? "" : "s"}
          </CardTitle>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <PlusIcon className="mr-1 h-3.5 w-3.5" /> Nova tag
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {tags.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma tag ainda. Crie a primeira pra usar em contatos, deals e conversas.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tags.map((tag) => {
                const total =
                  tag.usage.conversation +
                  tag.usage.contact +
                  tag.usage.company +
                  tag.usage.deal;
                return (
                  <li key={tag.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {tag.appliesTo.map((scope) => (
                          <Badge
                            key={scope}
                            variant="outline"
                            className="label-mono text-[9px]"
                          >
                            {SCOPE_LABELS[scope]}
                          </Badge>
                        ))}
                      </div>
                      <span className="ml-auto truncate text-muted-foreground text-xs">
                        {summarizeUsage(tag)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTag(tag)}
                        aria-label="Editar tag"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTag(tag)}
                        aria-label="Excluir tag"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="sr-only">{total > 0 ? `${total} usos` : "sem uso"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {showNew && (
        <TagFormDialog
          orgSlug={orgSlug}
          mode="create"
          onClose={() => setShowNew(false)}
        />
      )}
      {editingTag && (
        <TagFormDialog
          orgSlug={orgSlug}
          mode="edit"
          tag={editingTag}
          onClose={() => setEditingTag(null)}
        />
      )}

      <Dialog
        open={Boolean(deletingTag)}
        onOpenChange={(open) => !open && setDeletingTag(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover tag?</DialogTitle>
            <DialogDescription>
              {deletingTag && summarizeUsage(deletingTag) !== "sem uso"
                ? `Essa tag está aplicada em ${summarizeUsage(deletingTag)}. Tudo isso perde a tag. Sem volta.`
                : "Essa ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTag(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Sim, remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
