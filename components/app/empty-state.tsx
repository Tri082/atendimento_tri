import type { LucideIcon } from "lucide-react";
import { PackageIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  /** Ícone (componente Lucide). Padrão: PackageIcon. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Slot pra botão de ação (ex: "+ Novo"). */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = PackageIcon,
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      <div className="relative">
        <div className="absolute inset-0 -m-2 rounded-full bg-primary/10 blur-md" />
        <div className="relative grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="max-w-xs text-balance text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
