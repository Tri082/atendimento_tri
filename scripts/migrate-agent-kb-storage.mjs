#!/usr/bin/env node
// Move blobs do bucket agent-kb do prefixo {org_id}/{file} pro novo {org_id}/{agent_id}/{file}.
// Idempotente: skip se já está no destino. Roda APÓS a migration SQL (que já atualizou
// agent_documents.storage_path).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env.");
  process.exit(1);
}
const sb = createClient(url, key);

const BATCH = 10;

async function listDocs() {
  const { data, error } = await sb
    .from("agent_documents")
    .select("id, organization_id, agent_id, storage_path");
  if (error) throw error;
  return data ?? [];
}

async function moveOne(doc) {
  const desiredPrefix = `${doc.organization_id}/${doc.agent_id}/`;
  if (doc.storage_path.startsWith(desiredPrefix)) {
    // SQL já moveu a referência; falta confirmar que o blob físico está lá
    const { data, error } = await sb.storage.from("agent-kb").list(desiredPrefix, { limit: 1, search: doc.storage_path.slice(desiredPrefix.length) });
    if (error) {
      console.warn(`! check ${doc.id}: ${error.message}`);
      return { id: doc.id, status: "check-failed" };
    }
    if (data && data.length > 0) return { id: doc.id, status: "already-moved" };
  }

  // Path antigo é o storage_path SEM o /{agent_id}/ no meio
  const oldPath = doc.storage_path.replace(`/${doc.agent_id}/`, "/");
  const newPath = doc.storage_path;

  const { error: copyErr } = await sb.storage.from("agent-kb").copy(oldPath, newPath);
  if (copyErr) {
    if (copyErr.message?.includes("not found")) {
      // Original já foi removido em rodada anterior — ok
      return { id: doc.id, status: "original-missing" };
    }
    console.error(`! copy ${doc.id}: ${copyErr.message}`);
    return { id: doc.id, status: "copy-failed" };
  }

  const { error: delErr } = await sb.storage.from("agent-kb").remove([oldPath]);
  if (delErr) console.warn(`! remove old ${doc.id}: ${delErr.message}`);

  return { id: doc.id, status: "moved" };
}

const docs = await listDocs();
console.log(`Encontrados ${docs.length} documentos a verificar.\n`);

const tally = { moved: 0, "already-moved": 0, "original-missing": 0, "copy-failed": 0, "check-failed": 0 };
for (let i = 0; i < docs.length; i += BATCH) {
  const slice = docs.slice(i, i + BATCH);
  const results = await Promise.all(slice.map(moveOne));
  for (const r of results) {
    tally[r.status] = (tally[r.status] ?? 0) + 1;
    console.log(`  [${i + 1 + results.indexOf(r)}/${docs.length}] ${r.id} → ${r.status}`);
  }
}

console.log("\n=== Resumo ===");
for (const [k, v] of Object.entries(tally)) {
  console.log(`  ${k}: ${v}`);
}
