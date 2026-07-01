import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type { Kpi } from "@/lib/mock/dashboard";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = kpi.delta.direction === "up";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card glow-hover surface-highlight">
      {/* Top accent line (visible on hover) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/60" />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <span className="label-mono">{kpi.label}</span>
          <div
            className={`flex items-center gap-0.5 font-mono text-[10px] tracking-wide ${
              up ? "text-primary" : "text-destructive"
            }`}
          >
            {up ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {kpi.delta.value}
          </div>
        </div>

        <div className="mt-3 font-semibold text-3xl tracking-tight tabular-nums">{kpi.value}</div>
      </div>

      {/* Sparkline */}
      <Sparkline values={kpi.spark} up={up} />
    </div>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const w = 200;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${h - ((v - min) / range) * h}`).join(" ");
  const stroke = up ? "var(--color-chart-1)" : "var(--color-destructive)";

  return (
    <div className="-mt-2 relative h-10 w-full opacity-80">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`spark-${up ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#spark-${up ? "up" : "dn"})`} />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
