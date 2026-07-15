import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));
vi.mock("@/lib/automations/actions/assign-owner", () => ({
  assignOwnerAction: { execute: vi.fn().mockResolvedValue({ assigned_to: "user-1" }) },
}));
vi.mock("@/lib/messaging/onboarding/interpret", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messaging/onboarding/interpret")>();
  return {
    ...actual,
    interpretChoiceAnswer: vi.fn(),
    isCoherentTextAnswer: vi.fn().mockResolvedValue(true),
  };
});
vi.mock("@/lib/agent/rag/retrieve", () => ({
  retrieveContext: vi.fn().mockResolvedValue([]),
}));

import { processSendOutbound } from "@/lib/messaging/router";
import { assignOwnerAction } from "@/lib/automations/actions/assign-owner";
import { interpretChoiceAnswer, isCoherentTextAnswer } from "@/lib/messaging/onboarding/interpret";
import { retrieveContext } from "@/lib/agent/rag/retrieve";
import { advanceOnboardingFromMessage, startOnboarding } from "@/lib/messaging/onboarding/service";

const ORG_ID = "org-1";
const CONV_ID = "conv-1";

/**
 * Fake com estado real (não só recorder de chamadas) pras tabelas tocadas
 * pelo lock (`conversations.agent_status`) e pelo estado de onboarding —
 * `advanceOnboardingFromMessage`/`startOnboarding` agora releem essas
 * tabelas do banco em vez de confiar num snapshot passado pelo caller (ver
 * tests/messaging-onboarding-lock.test.ts pro motivo).
 */
function makeSupabase(opts?: {
  handledBy?: string | null;
  onboardingRow?: { current_step: string; answers: Record<string, unknown>; retry_count?: number };
}) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};
  const upserts: Record<string, unknown[]> = {};

  const conversation: Record<string, unknown> = {
    id: CONV_ID,
    agent_status: "idle",
    agent_thinking_started_at: null,
    contact_id: "contact-1",
    handled_by: opts?.handledBy ?? null,
  };
  let onboardingRow: Record<string, unknown> | null = opts?.onboardingRow
    ? {
        conversation_id: CONV_ID,
        organization_id: ORG_ID,
        current_step: opts.onboardingRow.current_step,
        answers: opts.onboardingRow.answers,
        retry_count: opts.onboardingRow.retry_count ?? 0,
      }
    : null;

  const sb = {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        inserts[table] = inserts[table] ?? [];
        inserts[table].push(payload);
        return { select: () => ({ single: async () => ({ data: { id: `${table}-new` }, error: null }) }) };
      },
      upsert: (payload: Record<string, unknown>) => {
        upserts[table] = upserts[table] ?? [];
        upserts[table].push(payload);
        if (table === "conversation_onboarding") {
          onboardingRow = {
            conversation_id: CONV_ID,
            organization_id: ORG_ID,
            retry_count: 0,
            ...payload,
          };
        }
        return { select: () => ({ single: async () => ({ data: { id: `${table}-upserted` }, error: null }) }) };
      },
      update: (payload: Record<string, unknown>) => {
        updates[table] = updates[table] ?? [];
        updates[table].push(payload);
        const builder = {
          eq: (_col: string, _val: unknown) => builder,
          select: (_cols?: string) => ({
            maybeSingle: async () => {
              if (table === "conversations") {
                Object.assign(conversation, payload);
                return { data: { id: conversation.id }, error: null };
              }
              return { data: null, error: null };
            },
          }),
          then: (resolve: (v: unknown) => void) => {
            if (table === "conversations") Object.assign(conversation, payload);
            if (table === "conversation_onboarding" && onboardingRow) Object.assign(onboardingRow, payload);
            resolve({ error: null });
          },
        };
        return builder;
      },
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "conversation_onboarding") return { data: onboardingRow, error: null };
              return { data: { contact_id: "contact-1", handled_by: conversation.handled_by }, error: null };
            },
          }),
          maybeSingle: async () => {
            if (table === "conversation_onboarding") return { data: onboardingRow, error: null };
            return { data: { contact_id: "contact-1", handled_by: conversation.handled_by }, error: null };
          },
        }),
      }),
    }),
  };

  return { sb: sb as never, inserts, updates, upserts, conversation };
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

  test("idempotente: se a linha de onboarding já existe (webhook duplicado concorrente), não reenvia a saudação", async () => {
    const { sb, inserts, upserts } = makeSupabase({
      onboardingRow: { current_step: "greeting_name", answers: {} },
    });

    await startOnboarding({ supabase: sb, orgId: ORG_ID, conversationId: CONV_ID });

    expect(upserts.conversation_onboarding).toBeUndefined();
    expect(inserts.messages).toBeUndefined();
  });
});

describe("advanceOnboardingFromMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("step de texto (greeting_name) avança e manda a próxima pergunta (botão, <=3 opções)", async () => {
    const { sb, inserts, updates } = makeSupabase({
      onboardingRow: { current_step: "greeting_name", answers: {} },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
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

  test("cliente manda só saudação (ex: 'bom dia, tudo bem?') antes de responder: responde educadamente e repete a pergunta pendente, sem contar como tentativa", async () => {
    const { sb, inserts, updates } = makeSupabase({
      onboardingRow: { current_step: "greeting_name", answers: {} },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: "Bom dia, tudo bem?",
      buttonReplyId: null,
    });

    // Não conta como tentativa: nem step nem retry_count mudam.
    expect(updates.conversation_onboarding).toBeUndefined();
    // Uma única mensagem: reconhecimento educado + a pergunta pendente.
    expect(inserts.messages).toHaveLength(1);
    const msg = inserts.messages?.[0] as { body: string };
    expect(msg.body).toContain("com quem eu teclo?");
    expect(msg.body.length).toBeGreaterThan("Bom dia, sou Trícia da TRI. Vou iniciar o seu atendimento tá? Me conta uma coisa, com quem eu teclo?".length);
  });

  test("step de choice com >3 opções manda texto numerado (sem provider_metadata.buttons)", async () => {
    const { sb, inserts } = makeSupabase({
      onboardingRow: { current_step: "first_order_check", answers: { name: "Maria" } },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: null,
      buttonReplyId: "sim",
    });

    const msg = inserts.messages?.[0] as { body: string; provider_metadata?: unknown };
    expect(msg.body).toContain("1) Instagram");
    expect(msg.body).toContain("5) Ganhei uma camisa");
    expect(msg.provider_metadata).toBeUndefined();
  });

  test("resposta em texto livre não reconhecida, sem hit na KB, re-pergunta o mesmo step (não avança)", async () => {
    const { sb, updates, inserts } = makeSupabase({
      onboardingRow: { current_step: "first_order_check", answers: { name: "Maria" } },
    });
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
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

  test("resposta coerente mas fora do script (sem hit na KB): reconhece e redireciona, sem dizer 'não entendi'", async () => {
    const { sb, updates, inserts } = makeSupabase({
      onboardingRow: { current_step: "greeting_name", answers: {} },
    });
    (isCoherentTextAnswer as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: "Gostaria de fazer um pedido",
      buttonReplyId: null,
    });

    // Continua contando como tentativa sem entender de verdade (mesmo
    // comportamento de antes pro contador de escalonamento).
    expect(updates.conversation_onboarding?.[0]).toMatchObject({ retry_count: 1 });
    expect(inserts.messages).toHaveLength(1);
    const msg = inserts.messages?.[0] as { body: string };
    expect(msg.body).not.toContain("Não entendi");
    expect(msg.body).toContain("com quem eu teclo?");
  });

  test("resposta tipo gibberish (sem hit na KB): mantém o aviso 'não entendi'", async () => {
    const { sb, inserts } = makeSupabase({
      onboardingRow: { current_step: "greeting_name", answers: {} },
    });
    (isCoherentTextAnswer as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: "kkkkkkk",
      buttonReplyId: null,
    });

    const msg = inserts.messages?.[0] as { body: string };
    expect(msg.body).toContain("Não entendi");
  });

  test("cliente foge do roteiro com pergunta que bate na KB: responde a KB e retoma a pergunta pendente", async () => {
    const { sb, updates, inserts } = makeSupabase({
      onboardingRow: { current_step: "first_order_check", answers: { name: "Maria" } },
    });
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([
      { kind: "faq", source_id: "faq-1", title: "Entrega", content: "Entregamos pra todo o Brasil.", similarity: 0.8 },
    ]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
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
    const { sb, inserts } = makeSupabase({
      onboardingRow: { current_step: "first_order_check", answers: { name: "Maria" } },
    });
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: null,
      messageText: "vocês entregam pra outro estado?",
      buttonReplyId: null,
    });

    expect(retrieveContext).not.toHaveBeenCalled();
    expect(inserts.messages).toHaveLength(1);
  });

  test("depois de MAX_STEP_RETRIES tentativas sem entender, escala pra humano em vez de repetir a pergunta de novo", async () => {
    const { sb, inserts, updates } = makeSupabase({
      onboardingRow: { current_step: "first_order_check", answers: { name: "Maria" }, retry_count: 2 },
    });
    (interpretChoiceAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retrieveContext as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: "ainda não entendi",
      buttonReplyId: null,
    });

    // Não reformula de novo — escala (completeOnboarding com reason "stalled")
    expect(updates.conversation_onboarding?.[0]).toMatchObject({ current_step: "completed" });
    // updates.conversations também recebe as escritas do lock (thinking/idle)
    // — procura especificamente a que marca o handoff.
    const handoffUpdate = updates.conversations?.find(
      (u): u is { handled_by: string; handoff_requested_at: string } =>
        (u as { handled_by?: string }).handled_by === "human",
    );
    expect(handoffUpdate).toMatchObject({
      handled_by: "human",
      handoff_requested_at: expect.any(String),
    });
    const closingMsg = inserts.messages?.[0] as { body: string };
    expect(closingMsg.body).toMatch(/time/i);
  });

  test("step final (handoff=true) marca handled_by=human, atribui e atualiza nome do contato", async () => {
    const { sb, updates } = makeSupabase({
      onboardingRow: { current_step: "files_status", answers: { name: "Maria" } },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: null,
      buttonReplyId: "sim_vetorizado",
    });

    expect(updates.conversation_onboarding?.[0]).toMatchObject({ current_step: "completed" });
    const handoffUpdate = updates.conversations?.find(
      (u): u is { handled_by: string; handoff_requested_at: string } =>
        (u as { handled_by?: string }).handled_by === "human",
    );
    expect(handoffUpdate).toMatchObject({
      handled_by: "human",
      handoff_requested_at: expect.any(String),
    });
    expect(updates.contacts?.[0]).toMatchObject({ name: "Maria" });
    expect(assignOwnerAction.execute).toHaveBeenCalledWith(
      { target: "conversation", target_id: CONV_ID, assignee: "round_robin" },
      expect.objectContaining({ orgId: ORG_ID }),
    );
  });

  test("step final (handoff=true) mas conversation JÁ está handled_by=human (handoff duplicado): não reatribui nem reposta o resumo", async () => {
    const { sb, inserts, updates } = makeSupabase({
      handledBy: "human",
      onboardingRow: { current_step: "files_status", answers: { name: "Maria" } },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: null,
      buttonReplyId: "sim_vetorizado",
    });

    expect(assignOwnerAction.execute).not.toHaveBeenCalled();
    // Nenhuma mensagem de resumo (system) inserida — handoff já tinha rodado antes.
    expect(inserts.messages).toBeUndefined();
    // Não reescreve handled_by nem contact rename de novo — as únicas
    // updates em `conversations` são as do lock (thinking/idle), nenhuma
    // com handled_by.
    expect(updates.conversations?.some((u) => "handled_by" in (u as object))).toBe(false);
    expect(updates.contacts).toBeUndefined();
  });

  test("onboarding já completado (fresh read dentro do lock) não reprocessa nem envia mensagem", async () => {
    const { sb, inserts, updates } = makeSupabase({
      onboardingRow: { current_step: "completed", answers: { name: "Maria" } },
    });

    await advanceOnboardingFromMessage({
      supabase: sb,
      orgId: ORG_ID,
      conversationId: CONV_ID,
      agentId: "agent-1",
      messageText: "oi de novo",
      buttonReplyId: null,
    });

    expect(inserts.messages).toBeUndefined();
    expect(updates.conversation_onboarding).toBeUndefined();
  });
});
