import { Card, CardContent } from "@/components/ui/card";
import type { DealKpis } from "@/lib/deals/queries";

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function KpiStrip({ kpis }: { kpis: DealKpis }) {
  const items = [
    { label: "Pipeline aberto", value: formatBrl(kpis.pipelineValue) },
    { label: "Ganhos esse mês", value: formatBrl(kpis.wonThisMonth) },
    { label: "Em negociação", value: kpis.inNegotiation.toString() },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="label-mono text-[10px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-semibold text-2xl tracking-tight">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
