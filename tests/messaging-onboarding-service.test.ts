import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));
vi.mock("@/lib/automations/actions/assign-owner", () => ({
  assignOwnerAction: { execute: vi.fn().mockResolvedValue({ assigned_to: "user-1" }) },
}));
vi.mock("@/lib/messaging/onboarding/interpret", () => ({
  interpretChoiceAnswer: vi.fn(),
  isCoherentTextAnswer: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/agent/rag/retrieve", () => ({
  retrieveContext: vi.fn().mockResolvedValue([]),
}));

import { processSendOutbound } from "@/lib/messaging/router";
import { assignOwnerAction } from "@/lib/automations/actions/assign-owner";
import { interpretChoiceAnswer } from "@/lib/messaging/onboarding/interpret";
import { retrieveContext } from "@/lib/agent/rag/retrieve";
import { advanceOnboardingFromMessage, startOnboarding } from "@/lib/messaging/onboarding/service";

const ORG_ID = "org-1";
const CONV_ID = "conv-1";

function makeSupabase(opts?: { handledBy?: string | null }) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};
  const upserts: Record<string, unknown[]> = {};
  const handledBy = opts?.handledBy ?? null;

  const sb = {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        inserts[table] = inserts[table] ?? [];
        inserts[table].push(payload);
        return { select: () => ({ single: async () => ({ data: { id: `${table}-new` }, error: null }) }) };
      },
      upsert: (payload: unknown) => {
        upserts[table] = upserts[table] ?? [];
        upserts[table].push(payload);
        return { select: () => ({ single: async () => ({ data: { id: `${table}-upserted` }, error: null }) }) };
      },
      update: (payload: unknown) => {
        updates[table] = updates[table] ?? [];
        updates[table].push(payload);
        return { eq: () => ({ eq: () => ({ error: null }), error: null }) };
      },
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { contact_id: "contact-1", handled_by: handledBy },
              error: null,
            }),
          }),
          maybeSingle: async () => ({
            data: { contact_id: "contact-1", handled_by: handledBy },
            error: null,
          }),
        }),
      }),
    }),
  };

  return { sb: sb as never, inserts, updates, upserts };
}

describe("startOnboarding", () => {
  beforeEach(() => vi.clearAllMocks());

  test("cria a linha de onboarding e manda a pergunta de saudação/nome", async () => {
    const { sb, inserts, upserts } = makeSupabase();

    await startOnboarding({ supabase: sb, orgId: ORG_ID, conversationId: CONV_ID });

    expect(upserts.conversation_onboarding?.[0]).toMatchObject({
      organization_id: ORG_ID,
      conversation_id: CONV_ID,
      current_step: "greeting_name",
    });
    expect(inserts.messages?.[0]).toMatchObject({
      organization_id: ORG_ID,
      conversation_id: CONV_ID,
      sender_kind: "bot",
      direction: "outbound",
    });
    expect(inserts.messages?.[0]).toHaveProperty("body");
    expect(processSendOutbound).toHaveBeenCalledWith("messages-new");
  });
});

describe("advanceOnboardingFromMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("step de texto (greeting_name) avança e manda a próxima pergunta (botão, <=3 opções)", async () => {
    const { sb, inserts, updates } = makeSupabase();

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "greeting_name", answers: {} },
      messageText: "Maria",
      buttonReplyId: null,
    });

    expect(updates.conversation_onboarding?.[0]).toMatchObject({
      current_step: "first_order_check",
    });
    expect((updates.conversation_onboarding?.[0] as { answers: { name: string } }).answers.name).toBe(
      "Maria",
    );
    const buttonsMsg = inserts.messages?.[0] as { provider_metadata?: { buttons?: unknown[] } };
    expect(buttonsMsg.provider_metadata?.buttons).toHaveLength(2);
  });

  test("step de choice com >3 opções manda texto numerado (sem provider_metadata.buttons)", async () => {
    const { sb, inserts } = makeSupabase();

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "first_order_check", answers: { name: "Maria" } },
      messageText: null,
      buttonReplyId: "sim",
    });

    const msg = inserts.messages?.[0] as { body: string; provider_metadata?: unknown };
    expect(msg.body).toContain("1) Instagram");
    expect(msg.body).toContain("5) Ganhei uma camisa");
    expect(msg.provider_metadata).toBeUndefined();
  });

  test("resposta em texto livre não reconhecida, sem hit na KB, re-pergunta o mesmo step (não avança)", async () => {
    const { sb, updates, inserts } = makeSupabase();
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "first_order_check", answers: { name: "Maria" } },
      messageText: "não entendi a pergunta",
      buttonReplyId: null,
    });

    // Sem hit na KB: incrementa retry_count (1ª tentativa sem entender)
    expect(updates.conversation_onboarding?.[0]).toMatchObject({ retry_count: 1 });
    // Só 1 mensagem enviada: a re-pergunta (não achou nada na KB pra responder antes)
    expect(inserts.messages).toHaveLength(1);
    const msg = inserts.messages?.[0] as { provider_metadata?: { buttons?: { id: string }[] } };
    expect(msg.provider_metadata?.buttons?.map((b) => b.id).sort()).toEqual(["nao", "sim"]);
  });

  test("cliente foge do roteiro com pergunta que bate na KB: responde a KB e retoma a pergunta pendente", async () => {
    const { sb, updates, inserts } = makeSupabase();
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([
      { kind: "faq", source_id: "faq-1", title: "Entrega", content: "Entregamos pra todo o Brasil.", similarity: 0.8 },
    ]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "first_order_check", answers: { name: "Maria" } },
      messageText: "vocês entregam pra outro estado?",
      buttonReplyId: null,
    });

    // Achou hit na KB: conta como ter ajudado, zera o retry_count
    expect(updates.conversation_onboarding?.[0]).toMatchObject({ retry_count: 0 });
    // 2 mensagens: a resposta da KB, seguida da re-pergunta do step pendente
    expect(inserts.messages).toHaveLength(2);
    expect((inserts.messages?.[0] as { body: string }).body).toBe("Entregamos pra todo o Brasil.");
    const secondMsg = inserts.messages?.[1] as { provider_metadata?: { buttons?: { id: string }[] } };
    expect(secondMsg.provider_metadata?.buttons?.map((b) => b.id).sort()).toEqual(["nao", "sim"]);
  });

  test("sem agentId, não tenta buscar na KB — só re-pergunta", async () => {
    const { sb, inserts } = makeSupabase();
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: null,
      onboarding: { currentStepId: "first_order_check", answers: { name: "Maria" } },
      messageText: "vocês entregam pra outro estado?",
      buttonReplyId: null,
    });

    expect(retrieveContext).not.toHaveBeenCalled();
    expect(inserts.messages).toHaveLength(1);
  });

  test("depois de MAX_STEP_RETRIES tentativas sem entender, escala pra humano em vez de repetir a pergunta de novo", async () => {
    const { sb, inserts, updates } = makeSupabase();
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "first_order_check", answers: { name: "Maria" }, retryCount: 2 },
      messageText: "ainda não entendi",
      buttonReplyId: null,
    });

    // Não reformula de novo — escala (completeOnboarding com reason "stalled")
    expect(updates.conversation_onboarding?.[0]).toMatchObject({ current_step: "completed" });
    expect(updates.conversations?.[0]).toMatchObject({ handled_by: "human" });
    const closingMsg = inserts.messages?.[0] as { body: string };
    expect(closingMsg.body).toMatch(/time/i);
  });

  test("step final (handoff=true) marca handled_by=human, atribui e atualiza nome do contato", async () => {
    const { sb, updates } = makeSupabase();

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "files_status", answers: { name: "Maria" } },
      messageText: null,
      buttonReplyId: "sim_vetorizado",
    });

    expect(updates.conversation_onboarding?.[0]).toMatchObject({ current_step: "completed" });
    expect(updates.conversations?.[0]).toMatchObject({ handled_by: "human" });
    expect(updates.contacts?.[0]).toMatchObject({ name: "Maria" });
    expect(assignOwnerAction.execute).toHaveBeenCalledWith(
      { target: "conversation", target_id: CONV_ID, assignee: "round_robin" },
      expect.objectContaining({ orgId: ORG_ID }),
    );
  });

  test("step final (handoff=true) mas conversation JÁ está handled_by=human (handoff duplicado): não reatribui nem reposta o resumo", async () => {
    const { sb, inserts, updates } = makeSupabase({ handledBy: "human" });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      onboarding: { currentStepId: "files_status", answers: { name: "Maria" } },
      messageText: null,
      buttonReplyId: "sim_vetorizado",
    });

    expect(assignOwnerAction.execute).not.toHaveBeenCalled();
    // Nenhuma mensagem de resumo (system) inserida — handoff já tinha rodado antes.
    expect(inserts.messages).toBeUndefined();
    // Não reescreve handled_by nem contact rename de novo.
    expect(updates.conversations).toBeUndefined();
    expect(updates.contacts).toBeUndefined();
  });
});
