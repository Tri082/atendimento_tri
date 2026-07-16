import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { assignOwnerAction } from "@/lib/automations/actions/assign-owner";
import { retrieveContext } from "@/lib/agent/rag/retrieve";
import { logError } from "@/lib/logger";
import { processSendOutbound } from "@/lib/messaging/router";
import { interpretChoiceAnswer, isCoherentTextAnswer, isPureGreeting, looksLikeRealMessage } from "./interpret";
import { advanceOnboarding, type OnboardingUserInput } from "./state-machine";
import {
  MAX_BUTTON_OPTIONS,
  ONBOARDING_STEPS,
  type OnboardingAnswers,
  type OnboardingStepId,
} from "./script";

type DB = SupabaseClient<Database>;

// Depois de N tentativas seguidas sem entender a resposta do cliente pro
// mesmo step, para de reformular (repetir a mesma pergunta) e escala pra
// humano — sem isso, uma resposta ambígua fazia o roteiro reenviar a pergunta
// indefinidamente a cada nova mensagem do cliente.
const MAX_STEP_RETRIES = 2;

const LOCK_RETRY_MS = 300;
const LOCK_MAX_WAIT_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializa o processamento de onboarding por conversa. Reaproveita o mesmo
 * lock condicional que o agente de IA usa (`conversations.agent_status`
 * 'idle' → 'thinking', ver `lib/agent/trigger.ts`) — sem isso, duas
 * mensagens do cliente chegando quase juntas (ex: "Oi" e "Bom dia" em
 * sequência) disparam duas chamadas concorrentes que leem o MESMO
 * `conversation_onboarding` desatualizado e cada uma decide/responde sem
 * saber da outra: pergunta repetida, nudge fora de contexto, step
 * incoerente — a Trícia "se enrola".
 *
 * Diferente do agente de IA, que desiste quando o lock já está ocupado
 * (a próxima rodada vai reler o histórico inteiro da conversa), o onboarding
 * processa UMA mensagem específica por chamada — desistir perderia a
 * resposta do cliente. Por isso esperamos a vez (retry) em vez de desistir,
 * com um teto de espera pra não travar pra sempre se algo já deixou a
 * conversa presa em 'thinking' (o cron de recovery libera isso em 5min).
 */
async function withConversationLock<T>(
  supabase: DB,
  conversationId: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  let acquired = false;

  for (;;) {
    const { data: locked } = await supabase
      .from("conversations")
      .update({ agent_status: "thinking", agent_thinking_started_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("agent_status", "idle")
      .select("id")
      .maybeSingle();

    if (locked) {
      acquired = true;
      break;
    }
    if (Date.now() >= deadline) break;
    await sleep(LOCK_RETRY_MS);
  }

  if (!acquired) {
    logError(
      "onboarding.lock-timeout",
      new Error(`Não conseguiu lock pra conversation ${conversationId} após ${LOCK_MAX_WAIT_MS}ms — desistindo desta mensagem.`),
    );
    return undefined;
  }

  try {
    return await fn();
  } finally {
    await supabase
      .from("conversations")
      .update({ agent_status: "idle", agent_thinking_started_at: null })
      .eq("id", conversationId)
      .eq("agent_status", "thinking");
  }
}

// Cliente só cumprimentou ("bom dia", "tudo bem?") — reconhece educadamente
// antes de repetir a pergunta pendente, em vez de ficar em silêncio (silêncio
// total parecia deselegante/quebrado) ou de mandar exatamente o mesmo texto
// sempre (padrão de conteúdo repetido em rajada, ver outbound-pacing.ts).
const GREETING_REPLIES = [
  "Tudo bem sim! 😊",
  "Tudo certo por aqui! 😊",
  "Tudo ótimo, obrigada! 😊",
  "Bem sim! 😊",
];

function pickGreetingReply(): string {
  return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)]!;
}

// Cliente disse algo coerente mas fora do que foi perguntado (ex: "gostaria
// de fazer um pedido" quando ela pediu o nome) — reconhece e redireciona pra
// pergunta pendente, SEM "não entendi": ela entendeu perfeitamente o que ele
// disse, só que não é a resposta que precisa agora. "Não entendi" nesse caso
// soa como se ela tivesse ignorado uma fala coerente do cliente.
const OFF_TOPIC_ACK_REPLIES = [
  "Show, já já chegamos lá!",
  "Beleza, a gente chega nisso já já!",
  "Combinado, só preciso de uma coisa antes:",
  "Entendi! Só mais um passo antes disso:",
];

function pickOffTopicAck(): string {
  return OFF_TOPIC_ACK_REPLIES[Math.floor(Math.random() * OFF_TOPIC_ACK_REPLIES.length)]!;
}

async function sendStepQuestion(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  stepId: OnboardingStepId;
  answers: OnboardingAnswers;
  nudge?: boolean;
  greetingAck?: boolean;
  offTopicAck?: boolean;
}): Promise<void> {
  const { supabase, orgId, conversationId, stepId, answers, nudge, greetingAck, offTopicAck } = params;
  const stepDef = ONBOARDING_STEPS[stepId];
  const questionText = stepDef.question(answers);

  let body = questionText;
  if (nudge) {
    body = `Não entendi bem sua resposta 🙏\n\n${questionText}`;
  } else if (greetingAck) {
    body = `${pickGreetingReply()}\n\n${questionText}`;
  } else if (offTopicAck) {
    body = `${pickOffTopicAck()}\n\n${questionText}`;
  }
  let providerMetadata: { buttons: { id: string; title: string }[] } | undefined;

  if (stepDef.kind === "choice" && stepDef.options) {
    if (stepDef.options.length <= MAX_BUTTON_OPTIONS) {
      providerMetadata = { buttons: stepDef.options.map((o) => ({ id: o.id, title: o.label })) };
    } else {
      const numbered = stepDef.options.map((o, i) => `${i + 1}) ${o.label}`).join("\n");
      body = `${questionText}\n\n${numbered}`;
    }
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: "outbound",
      sender_kind: "bot",
      body,
      status: "sending",
      ...(providerMetadata
        ? { provider_metadata: providerMetadata as unknown as Database["public"]["Tables"]["messages"]["Insert"]["provider_metadata"] }
        : {}),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    logError("onboarding.send-step-question", error ?? new Error("insert failed"));
    return;
  }

  after(() => processSendOutbound(inserted.id));
}

/** Roda quando uma conversa é criada — cria a linha de onboarding e manda
 * a primeira pergunta (saudação + nome). */
export async function startOnboarding(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
}): Promise<void> {
  const { supabase, orgId, conversationId } = params;

  await withConversationLock(supabase, conversationId, async () => {
    // Idempotência: quando duas mensagens do MESMO cliente chegam como a
    // primeira interação quase simultaneamente, o INSERT de `conversations`
    // no router pode colidir (UNIQUE) e os dois webhooks concorrentes
    // marcam `isNewConversation=true` — os dois chamam startOnboarding.
    // Sem esse check, o segundo sobrescreveria o step de volta pra
    // 'greeting_name' e reenviaria a saudação, duplicando a mensagem.
    const { data: existing } = await supabase
      .from("conversation_onboarding")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabase.from("conversation_onboarding").upsert(
      {
        organization_id: orgId,
        conversation_id: conversationId,
        current_step: "greeting_name",
        answers: {},
      },
      { onConflict: "conversation_id" },
    );

    if (error) {
      logError("onboarding.start", error);
      return;
    }

    await sendStepQuestion({
      supabase,
      orgId,
      conversationId,
      stepId: "greeting_name",
      answers: {},
    });
  });
}

async function completeOnboarding(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  answers: OnboardingAnswers;
  reason?: "completed" | "stalled";
}): Promise<void> {
  const { supabase, orgId, conversationId, answers, reason = "completed" } = params;

  // Busca contact_id + handled_by numa query só — reusa pro check de
  // idempotência abaixo E pro rename de contato mais adiante (evita 2
  // SELECTs na mesma tabela pro mesmo row).
  const { data: conv, error: convFetchError } = await supabase
    .from("conversations")
    .select("contact_id, handled_by")
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (convFetchError) {
    logError("onboarding.complete-fetch-conversation", convFetchError);
  }

  // Idempotência: se o handoff já rodou antes (ex: a primeira tentativa
  // marcou `conversations.handled_by='human'` mas falhou/perdeu o retry em
  // algum ponto anterior, e uma mensagem seguinte re-entrou no step final),
  // não reexecuta assign + resumo — evita atribuição round-robin duplicada
  // e mensagem de resumo repetida.
  if (conv?.handled_by === "human") {
    logError(
      "onboarding.complete-duplicate",
      new Error(`Handoff já concluído pra conversation ${conversationId} — ignorando chamada duplicada de completeOnboarding.`),
    );
    return;
  }

  // Mensagem de fechamento pro CLIENTE (via WhatsApp) — sem isso, depois da
  // última pergunta o roteiro só grava a nota interna abaixo (sender_kind
  // "system", nunca despachada pro adapter) e o cliente fica sem nenhuma
  // resposta, parecendo que o bot travou.
  const { data: closingMsg, error: closingError } = await supabase
    .from("messages")
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: "outbound",
      sender_kind: "bot",
      body:
        reason === "stalled"
          ? "Vou te passar direto pro nosso time continuar por aqui, tá bom? Eles te ajudam com o que precisar 🙂"
          : "Perfeito, já anotei tudo! Vou te passar pro nosso time agora, eles continuam seu atendimento por aqui mesmo 🙂",
      status: "sending",
    })
    .select("id")
    .single();

  if (closingError || !closingMsg) {
    logError("onboarding.closing-message", closingError ?? new Error("insert failed"));
  } else {
    after(() => processSendOutbound(closingMsg.id));
  }

  const { error: stepUpdateError } = await supabase
    .from("conversation_onboarding")
    .update({
      current_step: "completed",
      answers: answers as unknown as Database["public"]["Tables"]["conversation_onboarding"]["Update"]["answers"],
      completed_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId)
    .eq("organization_id", orgId);

  if (stepUpdateError) {
    logError("onboarding.complete-update", stepUpdateError);
  }

  const { error: handoffError } = await supabase
    .from("conversations")
    .update({ handled_by: "human", handoff_requested_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("organization_id", orgId);

  if (handoffError) {
    logError("onboarding.handoff-update", handoffError);
  }

  // Atualiza o nome do contato SE já existe um contato vinculado (por
  // telefone). Não cria contato novo aqui — fora de escopo desta primeira
  // versão (ver spec, seção "Fora de escopo").
  if (answers.name && conv?.contact_id) {
    const { error: renameError } = await supabase
      .from("contacts")
      .update({ name: answers.name })
      .eq("id", conv.contact_id)
      .eq("organization_id", orgId);

    if (renameError) {
      logError("onboarding.contact-rename", renameError);
    }
  }

  // assignOwnerAction.execute NÃO retorna { ok, error } — retorna o output
  // direto (ver ActionDefinition em lib/automations/schemas.ts) ou lança
  // exception em caso de falha (ver lib/automations/actions/assign-owner.ts).
  try {
    await assignOwnerAction.execute(
      { target: "conversation", target_id: conversationId, assignee: "round_robin" },
      { orgId, depth: 0, runId: `onboarding-${randomUUID()}` },
    );
  } catch (err) {
    logError("onboarding.assign-owner", err);
  }

  const summaryLines = [
    reason === "stalled"
      ? "Qualificação interrompida pela Trícia — cliente não conseguiu responder ao roteiro (respostas não reconhecidas repetidas):"
      : "Qualificação concluída pela Trícia:",
    answers.name ? `Nome: ${answers.name}` : null,
    answers.isFirstOrder !== undefined ? `Primeiro pedido: ${answers.isFirstOrder ? "sim" : "não"}` : null,
    answers.source ? `Como chegou: ${answers.source}` : null,
    answers.referredBy ? `Indicado por: ${answers.referredBy}` : null,
    answers.useCase ? `Uso: ${answers.useCase}` : null,
    answers.layoutStatus ? `Layout: ${answers.layoutStatus}` : null,
    answers.filesStatus ? `Arquivos: ${answers.filesStatus}` : null,
    answers.repeatLayoutChange ? `Layout do último pedido: ${answers.repeatLayoutChange}` : null,
  ].filter((line): line is string => Boolean(line));

  const { error: summaryError } = await supabase.from("messages").insert({
    organization_id: orgId,
    conversation_id: conversationId,
    direction: "outbound",
    sender_kind: "system",
    body: summaryLines.join("\n"),
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  if (summaryError) {
    logError("onboarding.summary-insert", summaryError);
  }
}

/** Roda a cada mensagem inbound enquanto o onboarding não terminou. Resolve
 * a resposta pro step atual, avança o estado e manda a próxima pergunta —
 * ou, se o roteiro concluiu, dispara o handoff pro humano.
 *
 * `agentId` (opcional): quando presente e a resposta não bate com nenhuma
 * opção do step atual, tenta achar a pergunta na base de conhecimento do
 * agente ANTES de reformular — cobre o caso do cliente "fugir do roteiro"
 * com uma pergunta pontual (ex: "vocês entregam pra outro estado?"). Manda
 * o trecho da KB (sem parafrasear via LLM — mantém simples e sem risco de
 * alucinação) e, na sequência, retoma a pergunta pendente. Sem hit na KB
 * (ou sem `agentId`), cai no comportamento padrão: só reformula.
 *
 * NÃO recebe o estado do onboarding do caller — adquire o lock da conversa
 * primeiro e só então relê `conversation_onboarding` do banco. Um snapshot
 * passado pelo caller ficaria desatualizado justamente no cenário que esse
 * lock existe pra cobrir (2 mensagens quase simultâneas, ver
 * `withConversationLock`). */
export async function advanceOnboardingFromMessage(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  agentId: string | null;
  messageText: string | null;
  buttonReplyId: string | null;
}): Promise<void> {
  const { supabase, orgId, conversationId, agentId, messageText, buttonReplyId } = params;

  await withConversationLock(supabase, conversationId, async () => {
    const { data: row } = await supabase
      .from("conversation_onboarding")
      .select("current_step, answers, retry_count")
      .eq("conversation_id", conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();

    // Sem linha (nunca deveria acontecer — router só chama isto quando já
    // viu uma linha) ou já completado nesse meio tempo por outra mensagem
    // concorrente: nada a fazer.
    if (!row || row.current_step === "completed") return;

    await runOnboardingStep({
      supabase,
      orgId,
      conversationId,
      agentId,
      onboarding: {
        currentStepId: row.current_step as OnboardingStepId,
        answers: (row.answers ?? {}) as OnboardingAnswers,
        retryCount: row.retry_count ?? 0,
      },
      messageText,
      buttonReplyId,
    });
  });
}

async function runOnboardingStep(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  agentId: string | null;
  onboarding: { currentStepId: OnboardingStepId; answers: OnboardingAnswers; retryCount: number };
  messageText: string | null;
  buttonReplyId: string | null;
}): Promise<void> {
  const { supabase, orgId, conversationId, agentId, onboarding, messageText, buttonReplyId } = params;
  const stepDef = ONBOARDING_STEPS[onboarding.currentStepId];
  const retryCount = onboarding.retryCount;

  // Cliente só cumprimentou ("bom dia", "tudo bem?") sem responder de verdade
  // ainda — não conta como tentativa (step e retry_count intactos), mas
  // responde com um reconhecimento educado + repete a pergunta pendente, em
  // vez de ficar em silêncio ou tratar a saudação como resposta errada.
  if (!buttonReplyId && messageText?.trim() && isPureGreeting(messageText)) {
    await sendStepQuestion({
      supabase,
      orgId,
      conversationId,
      stepId: onboarding.currentStepId,
      answers: onboarding.answers,
      greetingAck: true,
    });
    return;
  }

  let input: OnboardingUserInput | null = null;

  if (stepDef.kind === "text") {
    const trimmed = messageText?.trim();
    if (trimmed) {
      const coherent = await isCoherentTextAnswer(stepDef.question(onboarding.answers), trimmed);
      if (coherent) input = { kind: "text", text: trimmed };
    }
  } else {
    if (buttonReplyId) {
      input = { kind: "button", optionId: buttonReplyId };
    } else if (messageText?.trim() && stepDef.options) {
      const resolved = await interpretChoiceAnswer(stepDef.options, messageText.trim());
      if (resolved) input = { kind: "button", optionId: resolved };
    }
  }

  // Cliente clicou "Não sei o que é um arquivo vetorizado" — isso É uma
  // opção válida do step (advanceOnboarding fecharia pro humano direto), mas
  // antes de escalar vale explicar o conceito puxando da base de
  // conhecimento, pra dar chance do cliente responder com mais clareza.
  // Reusa o mesmo teto de tentativas do fallback de "fuga do roteiro" acima
  // pra não ficar reexplicando pra sempre se o cliente insistir em "não sei".
  if (
    onboarding.currentStepId === "files_status" &&
    input?.kind === "button" &&
    input.optionId === "nao_sei_vetorizado" &&
    retryCount < MAX_STEP_RETRIES
  ) {
    const hits = agentId ? await retrieveContext(agentId, "o que é um arquivo vetorizado", 1) : [];
    const topHit = hits[0];

    if (topHit) {
      const { data: kbMsg, error: kbErr } = await supabase
        .from("messages")
        .insert({
          organization_id: orgId,
          conversation_id: conversationId,
          direction: "outbound",
          sender_kind: "bot",
          body: topHit.content,
          status: "sending",
        })
        .select("id")
        .single();
      if (kbErr || !kbMsg) {
        logError("onboarding.files-status-explain", kbErr ?? new Error("insert failed"));
      } else {
        after(() => processSendOutbound(kbMsg.id));
      }

      const { error: retryUpdateError } = await supabase
        .from("conversation_onboarding")
        .update({ retry_count: retryCount + 1 })
        .eq("conversation_id", conversationId)
        .eq("organization_id", orgId);
      if (retryUpdateError) logError("onboarding.retry-count-update", retryUpdateError);

      await sendStepQuestion({
        supabase,
        orgId,
        conversationId,
        stepId: "files_status",
        answers: onboarding.answers,
      });
      return;
    }
    // Sem hit na base de conhecimento: segue pro comportamento padrão abaixo
    // (avança e escala pro humano), já que não tem o que explicar.
  }

  const result = input
    ? advanceOnboarding(onboarding.currentStepId, input, onboarding.answers)
    : { ok: false as const };

  if (!result.ok) {
    let gotKbHit = false;
    if (agentId && messageText?.trim()) {
      const hits = await retrieveContext(agentId, messageText.trim(), 1);
      const topHit = hits[0];
      if (topHit) {
        gotKbHit = true;
        const { data: kbMsg, error: kbErr } = await supabase
          .from("messages")
          .insert({
            organization_id: orgId,
            conversation_id: conversationId,
            direction: "outbound",
            sender_kind: "bot",
            body: topHit.content,
            status: "sending",
          })
          .select("id")
          .single();
        if (kbErr || !kbMsg) {
          logError("onboarding.faq-fallback", kbErr ?? new Error("insert failed"));
        } else {
          after(() => processSendOutbound(kbMsg.id));
        }
      }
    }

    // Achar algo na KB conta como ter ajudado o cliente (não é confusão) —
    // zera o contador. Sem hit nenhum, é mais uma tentativa sem entender.
    const newRetryCount = gotKbHit ? 0 : retryCount + 1;

    if (newRetryCount > MAX_STEP_RETRIES) {
      // Repetir a mesma pergunta indefinidamente é ruim pro cliente e é
      // exatamente o padrão de conteúdo repetido em rajada que sistemas
      // antifraude do WhatsApp podem flagar como automação — desiste de
      // reformular e escala pra humano com o que já foi coletado.
      await completeOnboarding({
        supabase,
        orgId,
        conversationId,
        answers: onboarding.answers,
        reason: "stalled",
      });
      return;
    }

    const { error: retryUpdateError } = await supabase
      .from("conversation_onboarding")
      .update({ retry_count: newRetryCount })
      .eq("conversation_id", conversationId)
      .eq("organization_id", orgId);
    if (retryUpdateError) logError("onboarding.retry-count-update", retryUpdateError);

    // Cliente disse algo coerente (não gibberish) que só não bateu com o que
    // foi pedido — reconhece e redireciona em vez de "não entendi", que soa
    // como se a fala dele tivesse sido ignorada (ver looksLikeRealMessage).
    const isCoherentButOffTopic =
      !gotKbHit && Boolean(messageText?.trim()) && looksLikeRealMessage(messageText!.trim());

    // Reformula (reenvia a pergunta, com um aviso a partir da 1ª tentativa
    // sem entender) sem avançar o step — seja porque a resposta não bateu
    // com nenhuma opção, seja depois de responder uma pergunta fora do
    // roteiro via KB acima.
    await sendStepQuestion({
      supabase,
      orgId,
      conversationId,
      stepId: onboarding.currentStepId,
      answers: onboarding.answers,
      nudge: !isCoherentButOffTopic && newRetryCount > 0,
      offTopicAck: isCoherentButOffTopic,
    });
    return;
  }

  const { error: advanceError } = await supabase
    .from("conversation_onboarding")
    .update({
      current_step: result.nextStepId,
      answers: result.answers as unknown as Database["public"]["Tables"]["conversation_onboarding"]["Update"]["answers"],
      retry_count: 0,
    })
    .eq("conversation_id", conversationId)
    .eq("organization_id", orgId);

  if (advanceError) {
    logError("onboarding.advance-update", advanceError);
  }

  if (result.handoff) {
    await completeOnboarding({ supabase, orgId, conversationId, answers: result.answers });
    return;
  }

  await sendStepQuestion({
    supabase,
    orgId,
    conversationId,
    stepId: result.nextStepId,
    answers: result.answers,
  });
}
