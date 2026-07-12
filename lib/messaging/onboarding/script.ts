export type OnboardingStepId =
  | "greeting_name"
  | "first_order_check"
  | "source"
  | "referred_by"
  | "use_case"
  | "layout_status"
  | "files_status"
  | "repeat_layout_check"
  | "completed";

export interface OnboardingAnswers {
  name?: string;
  isFirstOrder?: boolean;
  source?: string;
  referredBy?: string;
  useCase?: string;
  layoutStatus?: string;
  filesStatus?: string;
  repeatLayoutChange?: string;
}

export interface OnboardingChoiceOption {
  id: string;
  label: string;
}

export interface OnboardingStepDef {
  id: OnboardingStepId;
  kind: "text" | "choice";
  question: (answers: OnboardingAnswers) => string;
  options?: OnboardingChoiceOption[];
}

/** Acima disso, a pergunta vira texto numerado em vez de botão interativo
 * (WhatsApp/Evolution não garante mais de ~3 botões por mensagem). */
export const MAX_BUTTON_OPTIONS = 3;

export function getGreeting(date: Date): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export const ONBOARDING_STEPS: Record<OnboardingStepId, OnboardingStepDef> = {
  greeting_name: {
    id: "greeting_name",
    kind: "text",
    question: () =>
      `${getGreeting(new Date())}, sou Trícia da TRI. Vou iniciar o seu atendimento tá? Me conta uma coisa, com quem eu teclo?`,
  },
  first_order_check: {
    id: "first_order_check",
    kind: "choice",
    question: () => "É o seu primeiro pedido conosco?",
    options: [
      { id: "sim", label: "Sim" },
      { id: "nao", label: "Não" },
    ],
  },
  source: {
    id: "source",
    kind: "choice",
    question: () => "Como você chegou até a gente?",
    options: [
      { id: "instagram", label: "Instagram" },
      { id: "indicacao", label: "Indicação" },
      { id: "site", label: "Site" },
      { id: "viu_alguem_vestindo", label: "Vi alguém vestindo" },
      { id: "ganhou_camisa", label: "Ganhei uma camisa" },
    ],
  },
  referred_by: {
    id: "referred_by",
    kind: "text",
    question: () => "Quem foi que nos indicou?",
  },
  use_case: {
    id: "use_case",
    kind: "choice",
    question: () => "Qual seria o uso das camisas?",
    options: [
      { id: "evento_esportivo", label: "Evento esportivo" },
      { id: "fardamento", label: "Fardamento" },
      { id: "trabalho", label: "Trabalho" },
      { id: "outro", label: "Outro uso específico" },
    ],
  },
  layout_status: {
    id: "layout_status",
    kind: "choice",
    question: () =>
      "Você já tem um layout em mãos ou vai precisar da ajuda do nosso time de designers (construção de um novo ou ajuste de um já existente)?",
    options: [
      { id: "tem_layout", label: "Já tenho o layout" },
      { id: "precisa_design", label: "Preciso de ajuda do time de design" },
    ],
  },
  files_status: {
    id: "files_status",
    kind: "choice",
    question: () => "Você já tem os arquivos em mãos? Se sim, eles estão vetorizados?",
    options: [
      { id: "sim_vetorizado", label: "Sim, estão vetorizados" },
      { id: "sim_nao_vetorizado", label: "Sim, mas não estão vetorizados" },
      { id: "nao_tenho", label: "Ainda não tenho os arquivos" },
    ],
  },
  repeat_layout_check: {
    id: "repeat_layout_check",
    kind: "choice",
    question: () => "O layout é igual ao do último pedido ou teremos alterações?",
    options: [
      { id: "igual", label: "É igual ao último" },
      { id: "com_alteracoes", label: "Vai ter alterações" },
    ],
  },
  completed: {
    id: "completed",
    kind: "text",
    question: () => "",
  },
};
