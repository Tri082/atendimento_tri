// lib/automations/action-fields.ts
//
// Metadata de campos por action — usado pela UI do editor de automações pra
// renderizar o form de config de cada action (label PT-BR, tipo de controle,
// hint, required, etc.).
//
// IMPORTANTE: arquivo client-safe. Só literais, sem imports server-only.

/**
 * Opção de empresa pro dropdown `company_select`.
 * O Server Component pai busca via `getCompanies(orgId)` e propaga até
 * o form de config da action.
 */
export interface CompanyOption {
  id: string;
  name: string;
}

export interface ActionFieldMeta {
  /** Chave em `action.config` */
  key: string;
  /** Label PT-BR */
  label: string;
  /** Hint curto abaixo do campo */
  hint?: string;
  /**
   * Tipo de controle.
   * - `text`: Input single-line
   * - `textarea`: Input multi-line
   * - `select`: dropdown com `options`
   * - `number`: input numérico
   * - `email`: input email
   * - `json`: textarea com parse JSON
   * - `priority`: select fixo low/medium/high
   * - `company_select`: dropdown populado com empresas da org
   */
  type:
    | "text"
    | "textarea"
    | "select"
    | "number"
    | "email"
    | "json"
    | "priority"
    | "company_select";
  required?: boolean;
  /** Pra type=select: opções fixas. */
  options?: { value: string; label: string }[];
  /** Placeholder do input (não confundir com placeholder de template) */
  placeholder?: string;
  /** Se aceita inserir variável `{{...}}` */
  supportsVariables?: boolean;
}

const STAGE_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "negotiation", label: "Negociação" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

export const ACTION_FIELDS: Record<string, ActionFieldMeta[]> = {
  create_contact: [
    {
      key: "name",
      label: "Nome do contato",
      type: "text",
      required: true,
      supportsVariables: true,
      placeholder: "Ex: Lead WhatsApp",
    },
    {
      key: "phone",
      label: "Telefone (opcional)",
      type: "text",
      supportsVariables: true,
      hint: "Aceita variável tipo {{conversation.external_thread_id}}",
    },
    {
      key: "email",
      label: "Email (opcional)",
      type: "text",
      supportsVariables: true,
    },
    {
      key: "company_id",
      label: "Empresa (opcional)",
      type: "company_select",
      hint: "Selecione a empresa cadastrada.",
    },
  ],
  update_contact: [
    {
      key: "contact_id",
      label: "ID do contato",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "name",
      label: "Novo nome (opcional)",
      type: "text",
      supportsVariables: true,
    },
    {
      key: "email",
      label: "Novo email (opcional)",
      type: "text",
      supportsVariables: true,
    },
    {
      key: "phone",
      label: "Novo telefone (opcional)",
      type: "text",
      supportsVariables: true,
    },
  ],
  create_deal: [
    {
      key: "name",
      label: "Nome do deal",
      type: "text",
      required: true,
      supportsVariables: true,
      placeholder: "Ex: Novo lead WhatsApp",
    },
    {
      key: "stage",
      label: "Estágio inicial",
      type: "select",
      required: true,
      options: STAGE_OPTIONS,
    },
    {
      key: "value",
      label: "Valor (R$, opcional)",
      type: "number",
    },
    {
      key: "company_id",
      label: "Empresa",
      type: "company_select",
      required: true,
      hint: "Selecione a empresa cadastrada.",
    },
    {
      key: "contact_id",
      label: "Contato (opcional, UUID)",
      type: "text",
      supportsVariables: true,
      hint: "Aceita {{steps.0.contact_id}} pra usar contato criado em ação anterior.",
    },
  ],
  update_deal_stage: [
    {
      key: "deal_id",
      label: "ID do deal",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "new_stage",
      label: "Novo estágio",
      type: "select",
      required: true,
      options: STAGE_OPTIONS,
    },
  ],
  update_deal_fields: [
    {
      key: "deal_id",
      label: "ID do deal",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "name",
      label: "Novo nome (opcional)",
      type: "text",
      supportsVariables: true,
    },
    {
      key: "value",
      label: "Novo valor R$ (opcional)",
      type: "number",
    },
    {
      key: "notes",
      label: "Notas (opcional)",
      type: "textarea",
      supportsVariables: true,
    },
  ],
  create_task: [
    {
      key: "title",
      label: "Título da tarefa",
      type: "text",
      required: true,
      supportsVariables: true,
      placeholder: "Ex: Ligar pro {{contact.name}}",
    },
    {
      key: "description",
      label: "Descrição (opcional)",
      type: "textarea",
      supportsVariables: true,
    },
    {
      key: "priority",
      label: "Prioridade",
      type: "priority",
      required: true,
    },
    {
      key: "due_in_days",
      label: "Vencimento em dias (opcional)",
      type: "number",
      hint: "Ex: 1 = amanhã",
    },
  ],
  send_whatsapp_message: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
      hint: "Use {{conversation.id}} do trigger.",
    },
    {
      key: "text",
      label: "Texto da mensagem",
      type: "textarea",
      required: true,
      supportsVariables: true,
      placeholder: "Ex: Oi! Recebemos seu contato.",
    },
  ],
  send_whatsapp_template: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "template_name",
      label: "Nome do template aprovado",
      type: "text",
      required: true,
    },
    {
      key: "language_code",
      label: "Código do idioma",
      type: "text",
      required: true,
      placeholder: "pt_BR",
    },
    {
      key: "parameters",
      label: "Parâmetros (JSON)",
      type: "json",
      hint: 'Ex: ["João", "R$ 1.500"]',
    },
  ],
  send_email: [
    {
      key: "to",
      label: "Email destinatário",
      type: "email",
      required: true,
      supportsVariables: true,
      placeholder: "{{contact.email}}",
    },
    {
      key: "subject",
      label: "Assunto",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "body",
      label: "Corpo (texto puro, pode quebrar linha)",
      type: "textarea",
      required: true,
      supportsVariables: true,
    },
    {
      key: "preview",
      label: "Pré-visualização (opcional)",
      type: "text",
      supportsVariables: true,
    },
    {
      key: "heading",
      label: "Cabeçalho (opcional)",
      type: "text",
      supportsVariables: true,
    },
  ],
  assign_owner: [
    {
      key: "target",
      label: "Tipo do alvo",
      type: "select",
      required: true,
      options: [{ value: "conversation", label: "Conversa" }],
    },
    {
      key: "target_id",
      label: "ID do alvo",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "assignee",
      label: "Quem atribuir",
      type: "select",
      required: true,
      options: [
        { value: "round_robin", label: "Round-robin entre owner/admin" },
      ],
      hint: "Round-robin sorteia entre os membros owner/admin da org.",
    },
  ],
  pause_agent_on_conversation: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
      hint: "Use {{conversation.id}}.",
    },
  ],
  escalate_to_human: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "reason",
      label: "Motivo",
      type: "text",
      required: true,
      supportsVariables: true,
    },
  ],
  call_webhook: [
    {
      key: "url",
      label: "URL HTTPS do webhook",
      type: "text",
      required: true,
      placeholder: "https://hooks.zapier.com/...",
      hint: "Precisa ser HTTPS público.",
    },
    {
      key: "webhook_secret",
      label: "Segredo do webhook (≥16 chars)",
      type: "text",
      required: true,
      hint: "Já preenchido automaticamente quando você cria a partir do template.",
    },
    {
      key: "payload",
      label: "Payload (JSON)",
      type: "json",
      required: true,
      hint: 'Use variáveis tipo {"deal_id": "{{deal.id}}"}.',
    },
    {
      key: "headers",
      label: "Headers extras (JSON, opcional)",
      type: "json",
    },
  ],
  add_tag_to_conversation: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
      hint: "UUID da tag cadastrada em /settings/tags.",
    },
  ],
  remove_tag_from_conversation: [
    {
      key: "conversation_id",
      label: "ID da conversa",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  apply_tag_to_contact: [
    {
      key: "contact_id",
      label: "ID do contato",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  apply_tag_to_company: [
    {
      key: "company_id",
      label: "Empresa",
      type: "company_select",
      required: true,
      hint: "Selecione a empresa cadastrada.",
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  apply_tag_to_deal: [
    {
      key: "deal_id",
      label: "ID do deal",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  remove_tag_from_contact: [
    {
      key: "contact_id",
      label: "ID do contato",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  remove_tag_from_company: [
    {
      key: "company_id",
      label: "Empresa",
      type: "company_select",
      required: true,
      hint: "Selecione a empresa cadastrada.",
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
  remove_tag_from_deal: [
    {
      key: "deal_id",
      label: "ID do deal",
      type: "text",
      required: true,
      supportsVariables: true,
    },
    {
      key: "tag_id",
      label: "ID da tag",
      type: "text",
      required: true,
    },
  ],
};

export function getActionFields(actionId: string): ActionFieldMeta[] | null {
  return ACTION_FIELDS[actionId] ?? null;
}
