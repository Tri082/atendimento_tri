"use client";

interface Props {
  usage: { tokens: number; responses: number };
  cap: number;
}

export function UsageSummary({ usage, cap }: Props) {
  const pct = cap > 0 ? Math.round((usage.tokens / cap) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="font-medium">Uso hoje:</span>
        <span>{(usage.tokens / 1000).toFixed(1)}k tokens ({pct}% de {(cap / 1000).toFixed(0)}k)</span>
        <span className="text-muted-foreground">·</span>
        <span>{usage.responses} resposta{usage.responses === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-border">
        <div
          className={`h-full transition-all ${pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
