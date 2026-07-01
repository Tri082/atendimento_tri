import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/logger";
import { chunkDocument } from "./chunk";
import { embedMany_ } from "./embed";

const BATCH_SIZE = 20;

/**
 * Processa documento uploadado:
 * 1. download blob do Storage
 * 2. extract texto (pdf-parse)
 * 3. chunk
 * 4. embed em batch
 * 5. insert chunks
 * 6. update status='ready'
 */
export async function processDocument(documentId: string): Promise<void> {
  const supabase = createServiceClient();

  // 1. Marca processing
  const { data: doc, error: docErr } = await supabase
    .from("agent_documents")
    .update({ status: "processing" })
    .eq("id", documentId)
    .eq("status", "pending")
    .select("organization_id, agent_id, storage_path, filename")
    .single();
  if (docErr || !doc) {
    logError("agent.ingest.lock", docErr);
    return;
  }

  try {
    // 2. Download
    const { data: blob, error: dlErr } = await supabase.storage
      .from("agent-kb")
      .download(doc.storage_path);
    if (dlErr || !blob) throw new Error("Não foi possível baixar arquivo");

    const buf = Buffer.from(await blob.arrayBuffer());

    // 3. Extract texto via pdf-parse (CJS — dynamic import)
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buf);
    const text = parsed.text.trim();
    if (text.length === 0) throw new Error("PDF sem texto extraível");

    // 4. Chunk semântico (Sub-F)
    const { chunks, meta } = await chunkDocument(text);
    if (chunks.length === 0) throw new Error("Chunking produziu zero chunks");
    console.log(
      `[agent.ingest] doc=${documentId} chunks=${chunks.length} sentences=${meta.totalSentences} breakpoints=${meta.semanticBreakpoints} fallback=${meta.fallbackUsed}`,
    );

    // 5. Embed + insert em batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedMany_(batch);
      const rows = batch.map((content, idx) => ({
        organization_id: doc.organization_id,
        agent_id: doc.agent_id,
        document_id: documentId,
        chunk_index: i + idx,
        content,
        embedding: embeddings[idx] as unknown as string,
      }));
      const { error: insErr } = await supabase
        .from("agent_document_chunks")
        .insert(rows);
      if (insErr) throw new Error(`Insert chunks falhou: ${insErr.message}`);
    }

    // 6. Marca ready
    await supabase
      .from("agent_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
        ready_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", documentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logError("agent.ingest.process", err);
    await supabase
      .from("agent_documents")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", documentId);
  }
}

/** Resgata documentos travados em 'processing' há > 5min, marca 'failed'. */
export async function recoverStaleDocuments(): Promise<void> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("agent_documents")
    .update({
      status: "failed",
      error_message: "Processamento travou (timeout > 5min)",
    })
    .eq("status", "processing")
    .lt("created_at", cutoff);
  if (error) logError("agent.ingest.recover", error);
}
