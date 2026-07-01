"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTagAction, promoteSuggestionAction, updateTagAction } from "@/lib/tags/actions";
import type { TagScope } from "@/lib/tags/schemas";
import { TAG_COLOR_PALETTE } from "./tag-color-palette";

const ALL_SCOPES: TagScope[] = ["conversation", "contact", "company", "deal"];
const SCOPE_LABELS: Record<TagScope, string> = {
  conversation: "Conversa (Inbox)",
  contact: "Contato",
  company: "Empresa",
  deal: "Deal",
};

type CreateMode = { mode: "create" };
type EditMode = {
  mode: "edit";
  tag: { id: string; name: string; color: string; appliesTo: TagScope[] };
};
type PromoteMode = {
  mode: "promote";
  suggestion: { id: string; name: string };
};

type Props = (CreateMode | EditMode | PromoteMode) & {
  orgSlug: string;
  onClose: () => void;
};

export function TagFormDialog(props: Props) {
  const { orgSlug, onClose } = props;
  const initialName = props.mode === "edit" ? props.tag.name : props.mode === "promote" ? props.suggestion.name : "";
  const initialColor = props.mode === "edit" ? props.tag.color : TAG_COLOR_PALETTE[0];
  const initialScopes: TagScope[] = props.mode === "edit" ? props.tag.appliesTo : [...ALL_SCOPES];

  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<string>(initialColor);
  const [scopes, setScopes] = useState<TagScope[]>(initialScopes);
  const [isPending, startTransition] = useTransition();

  const toggleScope = (scope: TagScope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createTagAction({ orgSlug, name, color, appliesTo: scopes })
          : props.mode === "edit"
            ? await updateTagAction({ orgSlug, id: props.tag.id, name, color, appliesTo: scopes })
            : await promoteSuggestionAction({
                orgSlug,
                suggestionId: props.suggestion.id,
                color,
                appliesTo: scopes,
              });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        props.mode === "create"
          ? "Tag criada"
          : props.mode === "edit"
            ? "Tag atualizada"
            : "Sugestão promovida",
      );
      onClose();
    });
  };

  const title =
    props.mode === "create" ? "Nova tag" : props.mode === "edit" ? "Editar tag" : "Promover sugestão";
  const nameReadOnly = props.mode === "promote";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Nome</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              readOnly={nameReadOnly}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Onde pode ser usada</Label>
            <div className="space-y-2 rounded-md border border-border/60 bg-card/30 p-3">
              {ALL_SCOPES.map((scope) => (
                <div key={scope} className="flex items-center gap-2">
                  <Checkbox
                    id={`scope-${scope}`}
                    checked={scopes.includes(scope)}
                    onCheckedChange={() => toggleScope(scope)}
                  />
                  <Label
                    htmlFor={`scope-${scope}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {SCOPE_LABELS[scope]}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Tags de segmentação (VIP, Comprou X): deixa tudo marcado.
              Tags só pra conversa (Aguardando retorno): deixa só "Conversa".
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || scopes.length === 0 || name.trim().length === 0}
            >
              {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {props.mode === "create" ? "Criar tag" : props.mode === "edit" ? "Salvar" : "Promover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
