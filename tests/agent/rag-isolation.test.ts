// Integration test — depende de Supabase real (sem LLM).
// Auto-skip se SUPABASE_SERVICE_ROLE_KEY não está no env.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!HAS_SB)("RAG retrieval isolation per agent", () => {
  let orgId: string;
  let agentA: string;
  let agentB: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  async function insertFaq(agentId: string, q: string, a: string) {
    // Embedding placeholder — pra teste de isolation o conteúdo importa, não a similaridade real.
    // Vetor com valores constantes faz query similarity → ~1.0 com qualquer query.
    const embedding = Array(1536).fill(0.001);
    await sb.from("agent_faq_items").insert({
      organization_id: orgId,
      agent_id: agentId,
      question: q,
      answer: a,
      embedding: embedding as unknown as string,
    });
  }

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const { data: org } = await sb
      .from("organizations")
      .insert({ name: "test-rag-iso", slug: `test-rag-${Date.now()}` })
      .select("id")
      .single();
    orgId = org!.id;

    const { data: a } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "A" })
      .select("id")
      .single();
    agentA = a!.id;

    const { data: b } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "B" })
      .select("id")
      .single();
    agentB = b!.id;

    await insertFaq(agentA, "FAQ_A_Q1", "Resposta A 1");
    await insertFaq(agentA, "FAQ_A_Q2", "Resposta A 2");
    await insertFaq(agentB, "FAQ_B_Q1", "Resposta B 1");
    await insertFaq(agentB, "FAQ_B_Q2", "Resposta B 2");
    await insertFaq(agentB, "FAQ_B_Q3", "Resposta B 3");
  });

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("RPC agent_search_kb retorna apenas FAQs do agente A", async () => {
    const queryEmbedding = Array(1536).fill(0.001);
    const { data, error } = await sb.rpc("agent_search_kb", {
      _agent_id: agentA,
      _query_embedding: queryEmbedding as unknown as string,
      _limit: 10,
      _min_similarity: 0.0,
    });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(2);
    for (const hit of data!) {
      expect(hit.title).toMatch(/^FAQ_A/);
    }
  });

  it("RPC agent_search_kb retorna apenas FAQs do agente B", async () => {
    const queryEmbedding = Array(1536).fill(0.001);
    const { data, error } = await sb.rpc("agent_search_kb", {
      _agent_id: agentB,
      _query_embedding: queryEmbedding as unknown as string,
      _limit: 10,
      _min_similarity: 0.0,
    });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(3);
    for (const hit of data!) {
      expect(hit.title).toMatch(/^FAQ_B/);
    }
  });
});
