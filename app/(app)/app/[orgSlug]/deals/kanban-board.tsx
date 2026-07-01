"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { moveDealStageAction } from "@/lib/deals/actions";
import type { DealWithCompany } from "@/lib/deals/queries";
import { type DealStage, STAGE_LABELS, STAGE_ORDER } from "@/lib/deals/stages";
import { KanbanCard } from "./kanban-card";

type Props = {
  orgSlug: string;
  initial: Record<DealStage, DealWithCompany[]>;
};

export function KanbanBoard({ orgSlug, initial }: Props) {
  const [groups, setGroups] = useState(initial);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const needle = search.trim().toLowerCase();
    const result = {} as Record<DealStage, DealWithCompany[]>;
    for (const stage of STAGE_ORDER) {
      result[stage] = groups[stage].filter((d) => {
        const haystack = `${d.name} ${d.companyName}`.toLowerCase();
        return haystack.includes(needle);
      });
    }
    return result;
  }, [groups, search]);

  function findDeal(id: string): { deal: DealWithCompany; stage: DealStage } | null {
    for (const stage of STAGE_ORDER) {
      const found = groups[stage].find((d) => d.id === id);
      if (found) return { deal: found, stage };
    }
    return null;
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStage = over.id as DealStage;
    if (!STAGE_ORDER.includes(targetStage)) return;

    const found = findDeal(dealId);
    if (!found || found.stage === targetStage) return;

    const previous = groups;
    const next: Record<DealStage, DealWithCompany[]> = { ...groups };
    next[found.stage] = next[found.stage].filter((d) => d.id !== dealId);
    next[targetStage] = [{ ...found.deal, stage: targetStage }, ...next[targetStage]];
    setGroups(next);

    startTransition(async () => {
      const r = await moveDealStageAction({
        orgSlug,
        id: dealId,
        stage: targetStage,
      });
      if (!r.ok) {
        setGroups(previous);
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Input
        placeholder="Buscar por nome do deal ou empresa..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="-mx-6 -mb-24 min-h-0 flex-1 overflow-x-auto px-6 pb-6">
          <div className="flex h-full gap-3">
            {STAGE_ORDER.map((stage) => (
              <KanbanColumn key={stage} stage={stage} deals={filtered[stage]} orgSlug={orgSlug} />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  orgSlug,
}: {
  stage: DealStage;
  deals: DealWithCompany[];
  orgSlug: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 min-w-72 shrink-0 flex-col rounded-md border bg-card/40 p-2 transition ${
        isOver ? "border-primary/50 bg-card/70" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="label-mono text-[10px]">{STAGE_LABELS[stage]}</span>
        <span className="font-mono text-muted-foreground text-xs">{deals.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {deals.length === 0 ? (
          <p className="px-1 py-4 text-center text-muted-foreground text-xs">Vazio</p>
        ) : (
          deals.map((d) => <KanbanCard key={d.id} orgSlug={orgSlug} deal={d} />)
        )}
      </div>
    </div>
  );
}
