"use client";

import { SparklesIcon, XIcon, ZapIcon } from "lucide-react";

type Props = {
  name: string;
  color: string;
  appliedByKind?: "human" | "bot" | "automation";
  onRemove?: () => void;
};

export function TagChip({ name, color, appliedByKind = "human", onRemove }: Props) {
  const KindIcon =
    appliedByKind === "bot" ? SparklesIcon : appliedByKind === "automation" ? ZapIcon : null;
  const tooltip =
    appliedByKind === "bot"
      ? "Aplicada pelo agente IA"
      : appliedByKind === "automation"
        ? "Aplicada por automação"
        : undefined;
  return (
    <span
      className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
      title={tooltip}
    >
      {KindIcon && <KindIcon className="h-3 w-3 opacity-70" />}
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Remover ${name}`}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
