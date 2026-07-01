import type { Database } from "@/types/supabase";

export type DealStage = Database["public"]["Enums"]["deal_stage"];

/** Order matters: defines Kanban column order. */
export const STAGE_ORDER: readonly DealStage[] = [
  "new",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export const STAGE_LABELS: Record<DealStage, string> = {
  new: "Novo",
  qualified: "Qualificado",
  proposal_sent: "Proposta enviada",
  negotiation: "Em negociação",
  won: "Ganho",
  lost: "Perdido",
};

export const OPEN_STAGES: readonly DealStage[] = [
  "new",
  "qualified",
  "proposal_sent",
  "negotiation",
] as const;

export const TERMINAL_STAGES: readonly DealStage[] = ["won", "lost"] as const;
