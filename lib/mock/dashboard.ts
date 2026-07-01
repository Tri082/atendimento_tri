/**
 * Dados de exemplo do dashboard.
 *
 * TROQUE estes mocks por queries Supabase reais quando criar suas funcionalidades.
 * Peça ajuda ao Claude: "como busco dados de [sua tabela] aqui?"
 */

export type Kpi = {
  label: string;
  value: string;
  delta: { direction: "up" | "down"; value: string };
  spark: number[];
};

function spark(seed: number) {
  const out: number[] = [];
  let v = 50 + seed * 7;
  for (let i = 0; i < 12; i++) {
    v += (Math.sin(i * 1.2 + seed) + 0.4) * 10;
    out.push(Math.max(10, Math.round(v)));
  }
  return out;
}

export const kpisMock: Kpi[] = [
  {
    label: "Usuários ativos",
    value: "1.234",
    delta: { direction: "up", value: "+12%" },
    spark: spark(1),
  },
  {
    label: "Taxa de retenção",
    value: "89%",
    delta: { direction: "up", value: "+3%" },
    spark: spark(3),
  },
  {
    label: "Receita do mês",
    value: "R$ 4.520",
    delta: { direction: "down", value: "-2%" },
    spark: spark(5).reverse(),
  },
  {
    label: "Conversão",
    value: "5,8%",
    delta: { direction: "up", value: "+0,4%" },
    spark: spark(7),
  },
];

export type ChartPoint = { date: string; valor: number };

export const chartMock: ChartPoint[] = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().slice(0, 10),
    valor: Math.round(80 + Math.sin(i * 0.4) * 20 + i * 1.8),
  };
});
