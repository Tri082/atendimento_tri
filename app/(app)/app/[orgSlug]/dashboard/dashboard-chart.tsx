"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartPoint } from "@/lib/mock/dashboard";

const chartConfig = {
  valor: { label: "Valor", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

export function DashboardChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="valor-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 6"
          vertical={false}
          stroke="currentColor"
          strokeOpacity={0.08}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) =>
            new Date(d).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })
          }
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="currentColor"
          opacity={0.5}
          minTickGap={32}
        />
        <YAxis
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="currentColor"
          opacity={0.5}
          width={48}
        />
        <ChartTooltip
          cursor={{
            stroke: "var(--color-valor)",
            strokeDasharray: "3 3",
            strokeOpacity: 0.4,
          }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Area
          dataKey="valor"
          type="monotone"
          stroke="var(--color-valor)"
          fill="url(#valor-fill)"
          strokeWidth={2}
          isAnimationActive={false}
          activeDot={{
            r: 5,
            fill: "var(--color-valor)",
            stroke: "var(--color-card)",
            strokeWidth: 3,
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
