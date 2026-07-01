"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARD_W = 240;
const CARD_H = 56;
const GAP = 32;

export function FlowDiagram({
  triggerLabel,
  conditionsCount,
  actionLabels,
}: {
  triggerLabel: string;
  conditionsCount: number;
  actionLabels: string[];
}) {
  const nodes: { kind: "trigger" | "conditions" | "action"; label: string }[] =
    [
      { kind: "trigger", label: triggerLabel },
      ...(conditionsCount > 0
        ? [
            {
              kind: "conditions" as const,
              label: `${conditionsCount} condição(ões)`,
            },
          ]
        : []),
      ...actionLabels.map((l, i) => ({
        kind: "action" as const,
        label: `${i + 1}. ${l}`,
      })),
    ];
  const totalHeight = nodes.length * (CARD_H + GAP) + 16;
  const width = CARD_W + 32;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-mono text-[10px]">/ preview</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full"
          style={{ maxHeight: "60vh" }}
          aria-label="Diagrama do fluxo da automação"
          role="img"
        >
          <title>Fluxo da automação</title>
          {nodes.map((n, i) => {
            const y = i * (CARD_H + GAP);
            const fill =
              n.kind === "trigger"
                ? "#52d12f"
                : n.kind === "conditions"
                  ? "#7f7f7f"
                  : "#7d8aff";
            const label =
              n.label.length > 30 ? `${n.label.slice(0, 28)}…` : n.label;
            return (
              <g key={`n-${i}-${n.label}`}>
                {i > 0 && (
                  <line
                    x1={16 + CARD_W / 2}
                    y1={y - GAP + 4}
                    x2={16 + CARD_W / 2}
                    y2={y - 4}
                    stroke="currentColor"
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                  />
                )}
                <rect
                  x={16}
                  y={y}
                  width={CARD_W}
                  height={CARD_H}
                  rx={8}
                  fill={fill}
                  fillOpacity={0.1}
                  stroke={fill}
                />
                <text
                  x={16 + CARD_W / 2}
                  y={y + CARD_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill="currentColor"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
