import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { assignOwnerAction } from "@/lib/automations/actions/assign-owner";
import { retrieveContext } from "@/lib/agent/rag/retrieve";
import { logError } from "@/lib/logger";
import { processSendOutbound } from "@/lib/messaging/router";
import { interpretChoiceAnswer } from "./interpret";
import { advanceOnboarding, type OnboardingUserInput } from "./state-machine";
import {
  MAX_BUTTON_OPTIONS,
  ONBOARDING_STEPS,
  type OnboardingAnswers,
  type OnboardingStepId,
} from "./script";

type DB = SupabaseClient<Database>;

async function sendStepQuestion(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  stepId: OnboardingStepId;
  answers: OnboardingAnswers;
}): Promise<void> {
  const { supabase, orgId, conversationId, stepId, answers } = params;
  const stepDef = ONBOARDING_STEPS[stepId];
  const questionText = stepDef.question(answers);

  let body = questionText;
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
}

async function completeOnboarding(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  answers: OnboardingAnswers;
}): Promise<void> {
  const { supabase, orgId, conversationId, answers } = params;

  await supabase
    .from("conversation_onboarding")
    .update({
      current_step: "completed",
      answers: answers as unknown as Database["public"]["Tables"]["conversation_onboarding"]["Update"]["answers"],
      completed_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId)
    .eq("organization_id", orgId);

  const { error: handoffError } = await supabase
    .from("conversations")
    .update({ handled_by: "human" })
    .eq("id", conversationId)
    .eq("organization_id", orgId);

  if (handoffError) {
    logError("onboarding.handoff-update", handoffError);
  }

  // Atualiza o nome do contato SE já existe um contato vinculado (por
  // telefone). Não cria contato novo aqui — fora de escopo desta primeira
  // versão (ver spec, seção "Fora de escopo").
  if (answers.name) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("contact_id")
      .eq("id", conversationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (conv?.contact_id) {
      const { error: renameError } = await supabase
        .from("contacts")
        .update({ name: answers.name })
        .eq("id", conv.contact_id)
        .eq("organization_id", orgId);

      if (renameError) {
        logError("onboarding.contact-rename", renameError);
      }
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
    "Qualificação concluída pela Trícia:",
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
 * (ou sem `agentId`), cai no comportamento padrão: só reformula. */
export async function advanceOnboardingFromMessage(params: {
  supabase: DB;
  orgId: string;
  conversationId: string;
  agentId: string | null;
  onboarding: { currentStepId: OnboardingStepId; answers: OnboardingAnswers };
  messageText: string | null;
  buttonReplyId: string | null;
}): Promise<void> {
  const { supabase, orgId, conversationId, agentId, onboarding, messageText, buttonReplyId } = params;
  const stepDef = ONBOARDING_STEPS[onboarding.currentStepId];

  let input: OnboardingUserInput | null = null;

  if (stepDef.kind === "text") {
    if (messageText?.trim()) input = { kind: "text", text: messageText.trim() };
  } else {
    if (buttonReplyId) {
      input = { kind: "button", optionId: buttonReplyId };
    } else if (messageText?.trim() && stepDef.options) {
      const resolved = await interpretChoiceAnswer(stepDef.options, messageText.trim());
      if (resolved) input = { kind: "button", optionId: resolved };
    }
  }

  const result = input
    ? advanceOnboarding(onboarding.currentStepId, input, onboarding.answers)
    : { ok: false as const };

  if (!result.ok) {
    if (agentId && messageText?.trim()) {
      const hits = await retrieveContext(agentId, messageText.trim(), 1);
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
          logError("onboarding.faq-fallback", kbErr ?? new Error("insert failed"));
        } else {
          after(() => processSendOutbound(kbMsg.id));
        }
      }
    }

    // Reformula (reenvia a mesma pergunta) sem avançar o step — seja porque
    // a resposta não bateu com nenhuma opção, seja depois de responder uma
    // pergunta fora do roteiro via KB acima.
    await sendStepQuestion({
      supabase,
      orgId,
      conversationId,
      stepId: onboarding.currentStepId,
      answers: onboarding.answers,
    });
    return;
  }

  const { error: advanceError } = await supabase
    .from("conversation_onboarding")
    .update({
      current_step: result.nextStepId,
      answers: result.answers as unknown as Database["public"]["Tables"]["conversation_onboarding"]["Update"]["answers"],
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
