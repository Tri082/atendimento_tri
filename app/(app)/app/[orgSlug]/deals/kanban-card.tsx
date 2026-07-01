"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import type { DealWithCompany } from "@/lib/deals/queries";

type Props = {
  orgSlug: string;
  deal: DealWithCompany;
};

function formatBrl(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function KanbanCard({ orgSlug, deal }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-md border border-border bg-card p-3 shadow-sm transition ${
        isDragging ? "opacity-50" : "hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/app/${orgSlug}/deals/${deal.id}`}
          className="font-medium text-sm hover:underline"
        >
          {deal.name}
        </Link>
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label="Arrastar para mover"
          className="rounded text-muted-foreground hover:text-foreground"
        >
          <DragHandleIcon />
        </button>
      </div>
      <p className="mt-1.5 text-muted-foreground text-xs">{deal.companyName}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-xs">{formatBrl(deal.value)}</span>
        {deal.expected_close_date && (
          <span className="text-muted-foreground text-xs">{deal.expected_close_date}</span>
        )}
      </div>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}
