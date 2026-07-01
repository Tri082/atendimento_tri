import type { AutomationInput } from "./schemas";

export interface AutomationTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  helpText: string;
  /** Campos que aluno PRECISA preencher antes de ativar */
  needsPreActivation?: string[];
  automation: AutomationInput;
}

export const TEMPLATES: AutomationTemplate[] = [
  {
    id: "lead-whatsapp-cria-deal",
    emoji: "🎯",
    name: "Lead novo via WhatsApp → cria deal",
    description:
      "Quando alguém manda mensagem pela primeira vez no WhatsApp, cria contato + deal no estágio Novo + manda boas-vindas.",
    helpText:
      "Funciona com WhatsApp Cloud ou Evolution. Você precisa preencher o company_id da empresa onde o deal será criado.",
    needsPreActivation: ["actions.1.config.company_id"],
    automation: {
      name: "Lead WhatsApp → cria deal",
      description: "Captura novos leads do WhatsApp automaticamente.",
      trigger_type: "conversation.created",
      trigger_config: { channel_type_in: ["whatsapp_cloud", "whatsapp_evolution"] },
      conditions: [],
      actions: [
        {
          type: "create_contact",
          config: {
            name: "{{conversation.display_name}}",
            phone: "{{conversation.external_thread_id}}",
          },
          on_error: "stop",
        },
        {
          type: "create_deal",
          config: {
            name: "Novo lead WhatsApp",
            stage: "new",
            company_id: "PREENCHA_UUID_DA_EMPRESA",
            contact_id: "{{steps.0.contact_id}}",
          },
          on_error: "continue",
        },
        {
          type: "send_whatsapp_message",
          config: {
            conversation_id: "{{conversation.id}}",
            text: "Oi! Recebemos seu contato. Já te respondemos em instantes.",
          },
          on_error: "continue",
        },
      ],
      status: "paused",
    },
  },
  {
    id: "boas-vindas-novo-contato",
    emoji: "👋",
    name: "Boas-vindas a novo contato",
    description:
      "Toda vez que um contato é cadastrado com email, manda email de boas-vindas e cria tarefa pro time ligar.",
    helpText: "Você pode customizar o texto do email no formulário.",
    automation: {
      name: "Boas-vindas a novo contato",
      description: null,
      trigger_type: "contact.created",
      trigger_config: { only_with_email: true },
      conditions: [],
      actions: [
        {
          type: "send_email",
          config: {
            to: "{{contact.email}}",
            subject: "Bem-vindo à {{org.name}}!",
            body:
              "Olá {{contact.name}},\n\nQue bom ter você por aqui. Em breve um especialista entra em contato.\n\nAté breve!",
          },
          on_error: "continue",
        },
        {
          type: "create_task",
          config: {
            title: "Ligar pro {{contact.name}}",
            description: "Primeiro contato pós-cadastro",
            priority: "medium",
            due_in_days: 1,
          },
          on_error: "continue",
        },
      ],
      status: "paused",
    },
  },
  {
    id: "followup-proposta",
    emoji: "📤",
    name: "Follow-up de proposta enviada",
    description:
      "Quando um deal vai pra 'Proposta enviada', cria tarefa de follow-up em 2 dias.",
    helpText: "Útil pra não esquecer de cobrar resposta da proposta.",
    automation: {
      name: "Follow-up de proposta enviada",
      description: null,
      trigger_type: "deal.stage_changed",
      trigger_config: { only_new_stage: "proposal_sent" },
      conditions: [],
      actions: [
        {
          type: "create_task",
          config: {
            title: "Cobrar resposta da proposta — {{deal.name}}",
            priority: "high",
            due_in_days: 2,
          },
          on_error: "continue",
        },
      ],
      status: "paused",
    },
  },
  {
    id: "handoff-urgente",
    emoji: "🔥",
    name: "Lead esquecido — handoff urgente",
    description:
      "Quando o agente IA escala uma conversa, atribui um responsável e manda mensagem de cobertura.",
    helpText: "round_robin sorteia entre owner/admin da org.",
    automation: {
      name: "Handoff urgente",
      description: null,
      trigger_type: "agent.escalated",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "assign_owner",
          config: {
            target: "conversation",
            target_id: "{{conversation.id}}",
            assignee: "round_robin",
          },
          on_error: "continue",
        },
        {
          type: "pause_agent_on_conversation",
          config: { conversation_id: "{{conversation.id}}" },
          on_error: "continue",
        },
        {
          type: "send_whatsapp_message",
          config: {
            conversation_id: "{{conversation.id}}",
            text: "Já chamamos um especialista pra você!",
          },
          on_error: "continue",
        },
      ],
      status: "paused",
    },
  },
  {
    id: "integracao-zapier-ganho",
    emoji: "🌐",
    name: "Integração externa — deal ganho",
    description:
      "Quando um deal é marcado como Ganho, manda payload completo pra Zapier/n8n/Make.",
    helpText:
      "Cole a URL do seu webhook em 'url' e defina um webhook_secret de pelo menos 16 chars pra assinar.",
    needsPreActivation: ["actions.0.config.url", "actions.0.config.webhook_secret"],
    automation: {
      name: "Webhook deal ganho",
      description: null,
      trigger_type: "deal.stage_changed",
      trigger_config: { only_new_stage: "won" },
      conditions: [],
      actions: [
        {
          type: "call_webhook",
          config: {
            url: "https://hooks.zapier.com/SEU_HOOK_AQUI",
            webhook_secret: "TROQUE_ESTE_SECRETO_LONGO_DE_32_CHARS_NO_MINIMO",
            payload: {
              event: "deal.won",
              deal_id: "{{deal.id}}",
              deal_name: "{{deal.name}}",
              deal_value: "{{deal.value}}",
              org: "{{org.name}}",
              at: "{{now.iso}}",
            },
          },
          on_error: "stop",
        },
      ],
      status: "paused",
    },
  },
];

export function getTemplate(id: string): AutomationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
