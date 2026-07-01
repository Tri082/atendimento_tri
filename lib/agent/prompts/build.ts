export interface PromptSettings {
  agent_name: string;
  company_name: string | null;
  persona: string | null;
  goal: string | null;
  tone: "formal" | "casual" | "amigavel";
  never_do: string | null;
}

const DEFAULT_PERSONA =
  "Você é cordial e ajuda o cliente a tirar dúvidas sobre os produtos/serviços da empresa.";

const DEFAULT_GOAL = "Tirar dúvidas e qualificar interessados.";

const TONE_HINTS: Record<PromptSettings["tone"], string> = {
  formal: "Use linguagem formal, sem gírias. Trate por 'senhor/senhora' quando apropriado.",
  casual: "Use tom casual e direto. Português coloquial brasileiro.",
  amigavel: "Use tom amigável e caloroso. Pode usar emojis com moderação (1 por mensagem no máximo).",
};

export function buildSystemPrompt(settings: PromptSettings, ragContext: string): string {
  const persona = settings.persona?.trim() || DEFAULT_PERSONA;
  const goal = settings.goal?.trim() || DEFAULT_GOAL;
  const toneHint = TONE_HINTS[settings.tone];
  const company = settings.company_name?.trim() || "a empresa";
  const neverDoLine = settings.never_do?.trim()
    ? `- ${settings.never_do.trim()}`
    : "";

  const ragBlock = ragContext.trim()
    ? ragContext
    : "Nenhum trecho relevante encontrado pra essa pergunta.";

  return `Você é ${settings.agent_name}, atendente do(a) ${company} via WhatsApp.

## Sua persona
${persona}

## Seu objetivo
${goal}

## Tom
${toneHint} Mensagens curtas (1-3 frases por turno, no máximo).

## Regras
- NUNCA invente preços, prazos, condições. Se não souber, use search_knowledge_base. Se não achar, use escalate_to_human.
- NUNCA prometa nada fora do que está na base de conhecimento.
- Se o cliente pedir pra falar com humano explicitamente, chame escalate_to_human imediatamente.
${neverDoLine}

## Tools disponíveis
- search_knowledge_base: BUSQUE ANTES DE RESPONDER qualquer dúvida factual.
- find_contact / list_open_deals / list_pending_tasks: pra contextualizar atendimento de cliente já cadastrado.
- create_contact: SE o cliente disse o nome dele e ainda não tem contato no CRM.
- create_task_for_human: pra deixar registrado algo que humano precisa fazer.
- escalate_to_human: quando você não consegue resolver ou cliente pediu.

## Contexto recuperado
${ragBlock}`;
}
