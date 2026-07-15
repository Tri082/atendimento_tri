import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));
vi.mock("@/lib/automations/actions/assign-owner", () => ({
  assignOwnerAction: { execute: vi.fn().mockResolvedValue({ assigned_to: "user-1" }) },
}));
vi.mock("@/lib/messaging/onboarding/interpret", () => ({
  interpretChoiceAnswer: vi.fn(),
  isCoherentTextAnswer: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/agent/rag/retrieve", () => ({
  retrieveContext: vi.fn().mockResolvedValue([]),
}));

import { advanceOnboardingFromMessage } from "@/lib/messaging/onboarding/service";

const ORG_ID = "org-1";
const CONV_ID = "conv-1";

/**
 * Fake Supabase com estado real e lock condicional que só "concede" quando
 * agent_status realmente está 'idle' no momento exato do UPDATE — precisa
 * ser assim (não um recorder simples) pra reproduzir de verdade a race
 * condition: duas mensagens quase simultâneas na mesma conversa (ex: "Oi" e
 * "Bom dia" em sequência rápida) cada uma dispara sua própria chamada de
 * advanceOnboardingFromMessage via after() do webhook. Sem serialização, as
 * duas leem o mesmo retry_count desatualizado e a Trícia "se enrola"
 * (pergunta repetida, nudge fora de contexto) — exatamente o bug reportado.
 */
function makeRaceableSupabase() {
  const conversation = { id: CONV_ID, agent_status: "idle", agent_thinking_started_at: null as string | null };
  const onboarding = {
    conversation_id: CONV_ID,
    organization_id: ORG_ID,
    current_step: "greeting_name",
    answers: {} as Record<string, unknown>,
    retry_count: 0,
  };
  const messages: Record<string, unknown>[] = [];

  const sb = {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        if (table === "messages") messages.push(payload);
        return {
          select: () => ({ single: async () => ({ data: { id: `msg-${messages.length}` }, error: null }) }),
        };
      },
      update: (payload: Record<string, unknown>) => {
        const filters: [string, unknown][] = [];
        const builder = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return builder;
          },
          select: (_c?: string) => ({
            maybeSingle: async () => {
              if (table !== "conversations") return { data: null, error: null };
              const matches = filters.every(([k, v]) => (conversation as Record<string, unknown>)[k] === v);
              if (!matches) return { data: null, error: null };
              Object.assign(conversation, payload);
              return { data: { id: conversation.id }, error: null };
            },
          }),
          then: (resolve: (v: unknown) => void) => {
            if (table === "conversations") {
              const matches = filters.every(([k, v]) => (conversation as Record<string, unknown>)[k] === v);
              if (matches) Object.assign(conversation, payload);
            }
            if (table === "conversation_onboarding") Object.assign(onboarding, payload);
            resolve({ error: null });
          },
        };
        return builder;
      },
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "conversation_onboarding") return { data: { ...onboarding }, error: null };
              return { data: null, error: null };
            },
          }),
        }),
      }),
    }),
  };

  return { sb: sb as never, conversation, onboarding, messages };
}

describe("advanceOnboardingFromMessage — concorrência", () => {
  beforeEach(() => vi.clearAllMocks());

  test("2 mensagens quase simultâneas na mesma conversa são serializadas (não leem estado desatualizado uma da outra)", async () => {
    const { sb, onboarding, messages } = makeRaceableSupabase();

    await Promise.all([
      advanceOnboardingFromMessage({
        supabase: sb,
        orgId: ORG_ID,
        conversationId: CONV_ID,
        agentId: null,
        messageText: "Oi",
        buttonReplyId: null,
      }),
      advanceOnboardingFromMessage({
        supabase: sb,
        orgId: ORG_ID,
        conversationId: CONV_ID,
        agentId: null,
        messageText: "Bom dia",
        buttonReplyId: null,
      }),
    ]);

    // Se as duas chamadas rodassem em paralelo lendo o mesmo retry_count=0
    // desatualizado (bug), o resultado final ficaria em 1 (lost update). Com
    // o lock + releitura fresca, cada uma vê o incremento da anterior: 0→1→2.
    expect(onboarding.retry_count).toBe(2);
    // Uma mensagem de nudge por chamada — nem perdida, nem duplicada.
    expect(messages).toHaveLength(2);
  });
});
