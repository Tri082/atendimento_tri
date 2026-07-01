// Integration test — Supabase + OpenAI reais.
// Auto-skip se faltarem env vars.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HAS_SB = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const HAS_OPENAI = Boolean(process.env.OPENAI_API_KEY);

const PDF_TEXT_FIXTURE = `Política de Devolução

Você pode devolver qualquer produto em até 30 dias após a compra.

Procedimento

1. Entre em contato com o suporte por email.
2. Receba o código de retorno.
3. Embale o produto na embalagem original.
4. Envie pelos Correios.

Garantia de Fábrica

Todos os produtos têm garantia mínima de 12 meses contra defeitos de fabricação. Em caso de defeito, entre em contato com a Assistência Técnica autorizada.

Suporte 24h

Para emergências fora do horário comercial, ligue para 0800-123-4567. Nosso atendimento 24h está disponível todos os dias.`.repeat(3);

describe.skipIf(!HAS_SB || !HAS_OPENAI)("chunking E2E", () => {
  let orgId: string;
  let agentId: string;
  let sb: import("@supabase/supabase-js").SupabaseClient;

  beforeAll(async () => {
    const { createServiceClient } = await import("@/lib/supabase/service");
    sb = createServiceClient();

    const { data: org } = await sb
      .from("organizations")
      .insert({ name: "chunk-e2e", slug: `chunk-e2e-${Date.now()}` })
      .select("id")
      .single();
    orgId = org!.id;

    const { data: agent } = await sb
      .from("agents")
      .insert({ organization_id: orgId, name: "Chunk Test" })
      .select("id")
      .single();
    agentId = agent!.id;
  }, 30_000);

  afterAll(async () => {
    if (orgId) await sb.from("organizations").delete().eq("id", orgId);
  });

  it("processa documento e gera chunks com envelope [minSize, maxSize]", async () => {
    const { data: doc } = await sb
      .from("agent_documents")
      .insert({
        organization_id: orgId,
        agent_id: agentId,
        filename: "fixture.txt",
        storage_path: `${orgId}/${agentId}/fixture.txt`,
        mime_type: "text/plain",
        size_bytes: PDF_TEXT_FIXTURE.length,
        status: "ready",
        chunk_count: 0,
      })
      .select("id")
      .single();

    const { chunkDocument } = await import("@/lib/agent/rag/chunk");
    const result = await chunkDocument(PDF_TEXT_FIXTURE);

    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    expect(result.meta.totalSentences).toBeGreaterThan(0);

    for (const chunk of result.chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1200 + 200);
    }
    const idealChunks = result.chunks.filter((c) => c.length >= 400 && c.length <= 1200);
    expect(idealChunks.length).toBeGreaterThan(0);

    const allText = result.chunks.join(" ");
    for (const keyword of ["Política de Devolução", "Garantia", "0800-123-4567", "Suporte 24h"]) {
      expect(allText).toContain(keyword);
    }

    // Cleanup explícito do doc (afterAll cuida da org)
    if (doc) await sb.from("agent_documents").delete().eq("id", doc.id);
  }, 60_000);
});
