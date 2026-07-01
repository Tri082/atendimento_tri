"use client";
import { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyOption } from "@/lib/automations/action-fields";
import { ActionConfigDialog } from "./action-config-dialog";

interface ActionDefLite {
  id: string;
  label: string;
  description: string;
  category: string;
}

interface ActionData {
  type: string;
  config: Record<string, unknown>;
  on_error: "stop" | "continue";
}

const CATEGORY_LABEL: Record<string, string> = {
  crm: "CRM",
  messaging: "Mensageria",
  org: "Organização",
  external: "Externo",
};

/**
 * Sub-H Round-2 #11: IDs estáveis via array paralelo de UIDs.
 *
 * Antes: `action-${idx}` puro. Quando arrayMove() reordena, o mesmo idx aponta
 * pra outra action, então o `id` que dnd-kit guarda em ref invalida e drag
 * subsequente fica "preso". Solução: gerar uuid por action quando ela entra
 * no array, manter alinhado com o `value` prop via length-check, e usar o uid
 * como key/id pro SortableContext.
 *
 * Decisão simples: armazenar UIDs em ref paralela (não precisa rerender).
 * Sync com `value.length`: quando o parent passa array de tamanho diferente
 * (load inicial, reset), regenera UIDs preservando os existentes pelo índice.
 */
function useStableUids(length: number): string[] {
  const uidsRef = useRef<string[]>([]);
  if (uidsRef.current.length !== length) {
    const next: string[] = [];
    for (let i = 0; i < length; i++) {
      next[i] = uidsRef.current[i] ?? crypto.randomUUID();
    }
    uidsRef.current = next;
  }
  return uidsRef.current;
}

export function ActionsSection({
  actionDefs,
  triggerType,
  value,
  companies,
  onChange,
}: {
  actionDefs: ActionDefLite[];
  triggerType: string;
  value: ActionData[];
  companies: CompanyOption[];
  onChange: (v: ActionData[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const uids = useStableUids(value.length);
  // Tracking de uids ↔ posição pra reordenar via drag.
  const uidsRef = useRef<string[]>(uids);
  useEffect(() => {
    uidsRef.current = uids;
  }, [uids]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = uids.findIndex((u) => u === active.id);
    const newIdx = uids.findIndex((u) => u === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    // Move UIDs e value em paralelo pra manter alinhamento.
    uidsRef.current = arrayMove(uids, oldIdx, newIdx);
    onChange(arrayMove(value, oldIdx, newIdx));
  }

  function addAction(type: string) {
    const newIdx = value.length;
    onChange([...value, { type, config: {}, on_error: "stop" }]);
    setAddOpen(false);
    setEditIdx(newIdx);
  }

  function updateAction(idx: number, patch: Partial<ActionData>) {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch } as ActionData;
    onChange(next);
  }

  function removeAction(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  const grouped = actionDefs.reduce<Record<string, ActionDefLite[]>>(
    (acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    },
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Então</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {value.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Adicione ao menos uma ação.
          </p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={uids}
            strategy={verticalListSortingStrategy}
          >
            {value.map((action, idx) => {
              const uid = uids[idx] ?? `fallback-${idx}`;
              return (
                <SortableActionRow
                  key={uid}
                  id={uid}
                  idx={idx}
                  action={action}
                  label={
                    actionDefs.find((d) => d.id === action.type)?.label ??
                    action.type
                  }
                  onEdit={() => setEditIdx(idx)}
                  onToggleOnError={() =>
                    updateAction(idx, {
                      on_error:
                        action.on_error === "stop" ? "continue" : "stop",
                    })
                  }
                  onRemove={() => removeAction(idx)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        {value.length < 20 && (
          <div className="pt-2">
            {!addOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon className="h-4 w-4 mr-1" /> Adicionar ação
              </Button>
            ) : (
              <div className="rounded-md border border-border p-3 space-y-3">
                {Object.entries(grouped).map(([cat, defs]) => (
                  <div key={cat}>
                    <p className="text-xs font-mono uppercase text-muted-foreground mb-1">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {defs.map((d) => (
                        <Button
                          key={d.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => addAction(d.id)}
                          className="justify-start text-left h-auto flex-col items-start gap-0.5 px-2 py-1.5"
                        >
                          <span className="font-medium text-sm">{d.label}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {d.description}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {editIdx !== null && value[editIdx] ? (
        (() => {
          const editing = value[editIdx];
          return (
            <ActionConfigDialog
              action={editing}
              actionDef={
                actionDefs.find((d) => d.id === editing.type) ?? null
              }
              triggerType={triggerType}
              companies={companies}
              onSave={(updated) => {
                updateAction(editIdx, updated);
                setEditIdx(null);
              }}
              onClose={() => setEditIdx(null)}
            />
          );
        })()
      ) : null}
    </Card>
  );
}

function SortableActionRow({
  id,
  idx,
  action,
  label,
  onEdit,
  onToggleOnError,
  onRemove,
}: {
  id: string;
  idx: number;
  action: ActionData;
  label: string;
  onEdit: () => void;
  onToggleOnError: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-background p-2"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
      >
        <GripVerticalIcon className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs">
          {idx + 1}. {label}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleOnError}
        className={`text-xs rounded px-2 py-0.5 ${
          action.on_error === "stop"
            ? "bg-destructive/10 text-destructive"
            : "bg-secondary"
        }`}
        title="Clique pra alternar entre parar/continuar em erro"
      >
        {action.on_error === "stop" ? "para se falhar" : "segue se falhar"}
      </button>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <SettingsIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </div>
  );
}
