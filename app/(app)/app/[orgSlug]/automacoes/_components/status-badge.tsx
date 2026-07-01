"use client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Ativa", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  pending: { label: "Aguardando", variant: "secondary" },
  running: { label: "Rodando", variant: "secondary" },
  completed: { label: "Concluída", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  skipped_conditions: { label: "Condição barrou", variant: "outline" },
  skipped_recursion: { label: "Recursão demais", variant: "outline" },
  skipped_queue_full: { label: "Fila cheia", variant: "outline" },
  skipped_payload_too_large: { label: "Evento grande demais", variant: "outline" },
  dry_run: { label: "Simulação", variant: "outline" },
  skipped: { label: "Pulou", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
