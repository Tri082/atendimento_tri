import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/messaging/router", () => ({ processSendOutbound: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/llm", () => ({ getLanguageModel: vi.fn().mockReturnValue("mock-model") }));
vi.mock("@/lib/agent/rag/retrieve", () => ({
  retrieveContext: vi.fn().mockResolvedValue([]),
  formatRagBlock: vi.fn().mockReturnValue(""),
}));
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: vi.fn() };
});

import { generateText } from "ai";
import { createServiceClient } from "@/lib/supabase/service";
import { runAgent } from "@/lib/agent/run";

const mockedCreate = createServiceClient as unknown as ReturnType<typeof vi.fn>;

function buildSupabase(handledBy: string | null, capture?: { inserts: Record<string, unknown[]>; updates: Record<string, unknown[]> }) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                is_active: true,
                daily_token_cap: 100000,
                name: "Trícia",
                company_name: "TRI",
                persona: null,
                goal: null,
                tone: "amigavel",
                never_do: null,
                llm_provider: "anthropic",
                llm_model: "x",
              },
              error: null,
            }),
          }),
          maybeSingle: async () => {
            if (table === "conversations") {
              return {
                data: {
                  id: "conv-1",
                  organization_id: "org-1",
                  contact_id: null,
                  external_thread_id: "+5511987654321",
                  handled_by: handledBy,
                  channel: { id: "ch-1", type: "mock", name: "" },
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
      insert: (payload: unknown) => {
        capture?.inserts[table]?.push(payload) ?? (capture && (capture.inserts[table] = [payload]));
        return { select: () => ({ single: async () => ({ data: { id: "run-1" }, error: null }) }) };
      },
      update: (payload: unknown) => {
        capture?.updates[table]?.push(payload) ?? (capture && (capture.updates[table] = [payload]));
        return { eq: () => ({ eq: () => ({ error: null }), error: null }) };
      },
    }),
    rpc: async () => ({ data: true, error: null }),
  };
}

describe("runAgent — modo FAQ-only pós-handoff", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    (generateText as ReturnType<typeof vi.fn>).mockReset();
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "resposta",
      usage: { inputTokens: 10, outputTokens: 10 },
      steps: [],
    });
  });

  test("handled_by='human' restringe tools a search_knowledge_base", async () => {
    mockedCreate.mockReturnValue(buildSupabase("human"));

    await runAgent({ orgId: "org-1", agentId: "agent-1", conversationId: "conv-1" });

    const call = (generateText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      tools: Record<string, unknown>;
      system: string;
    };
    expect(Object.keys(call.tools)).toEqual(["search_knowledge_base"]);
    expect(call.system).toContain("já foi transferida pra um atendente humano");
  });

  test("handled_by=null usa todas as tools (modo full)", async () => {
    mockedCreate.mockReturnValue(buildSupabase(null));

    await runAgent({ orgId: "org-1", agentId: "agent-1", conversationId: "conv-1" });

    const call = (generateText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      tools: Record<string, unknown>;
    };
    expect(Object.keys(call.tools).length).toBeGreaterThan(1);
  });

  test("resposta do modelo em JSON bruto não vai pro cliente — escala e manda mensagem segura", async () => {
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: '{"can_escalate":false,"reason":"Cliente respondeu \'1\' sem indicar claramente pedido de falar com humano"}',
      usage: { inputTokens: 10, outputTokens: 10 },
      steps: [],
    });
    const capture = { inserts: {} as Record<string, unknown[]>, updates: {} as Record<string, unknown[]> };
    mockedCreate.mockReturnValue(buildSupabase(null, capture));

    await runAgent({ orgId: "org-1", agentId: "agent-1", conversationId: "conv-1" });

    expect(capture.updates.conversations?.[0]).toMatchObject({ agent_status: "paused_handoff" });
    expect(capture.inserts.tasks?.[0]).toMatchObject({ priority: "high" });
    const sentMessage = capture.inserts.messages?.[0] as { body: string };
    expect(sentMessage.body).not.toContain("can_escalate");
    expect(sentMessage.body.startsWith("{")).toBe(false);
  });

  test("escalate_to_human chamada no turno: não insere/manda segunda mensagem do texto do modelo", async () => {
    // A tool escalate_to_human já manda sua própria mensagem determinística
    // pro cliente (lib/agent/tools/escalate.ts). Se o modelo, mesmo assim,
    // devolver texto final em result.text, runAgent NÃO pode inserir/enviar
    // esse texto como uma segunda mensagem — senão o cliente recebe duas.
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: "Já chamei alguém pra te ajudar!",
      usage: { inputTokens: 10, outputTokens: 10 },
      steps: [
        {
          toolCalls: [{ toolName: "escalate_to_human" }],
        },
      ],
    });
    const capture = { inserts: {} as Record<string, unknown[]>, updates: {} as Record<string, unknown[]> };
    mockedCreate.mockReturnValue(buildSupabase(null, capture));

    await runAgent({ orgId: "org-1", agentId: "agent-1", conversationId: "conv-1" });

    expect(capture.inserts.messages).toBeUndefined();
  });
});
