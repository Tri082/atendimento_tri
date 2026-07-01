/**
 * 12 cores fixas pra combinar com o tema dark + verde Kawasaki.
 * Sem color picker free pra evitar combinações ilegíveis.
 */
export const TAG_COLOR_PALETTE = [
  "#52d12f", // verde kawasaki
  "#22c55e", // verde médio
  "#10b981", // teal
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#a3a3a3", // cinza
  "#525252", // grafite
] as const;

export type TagColor = (typeof TAG_COLOR_PALETTE)[number];
