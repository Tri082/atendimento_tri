#!/usr/bin/env node
// Conta dados que serão impactados pela migration multi-agentes.
// Roda ANTES de aplicar a migration em produção.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env.");
  process.exit(1);
}
const sb = createClient(url, key);

async function count(table, filter) {
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

const orgs = await count("organizations");
const settings = await count("agent_settings");
const faqs = await count("agent_faq_items");
const docs = await count("agent_documents");
const chunks = await count("agent_document_chunks");
const channelsActive = await count("channels", (q) => q.eq("agent_enabled", true));
const usageDays = await count("agent_org_usage");

console.log("\n=== Pré-flight check: migration multi-agentes ===\n");
console.log(`Organizações: ${orgs}`);
console.log(`  Vão receber 1 "Agente Principal" cada.`);
console.log(`  ${settings} delas já têm agent_settings (herdam config).`);
console.log(`  ${orgs - settings} ficam com defaults.`);
console.log(`\nDados a migrar pro "Agente Principal" da respectiva org:`);
console.log(`  ${faqs} FAQs`);
console.log(`  ${docs} documentos (PDFs)`);
console.log(`  ${chunks} chunks de documentos`);
console.log(`  ${usageDays} dias de uso histórico`);
console.log(`\nCanais com agente ativo: ${channelsActive}`);
console.log(`  Esses recebem channel.agent_id = "Agente Principal".`);
console.log(`  Demais ficam com channel.agent_id = NULL.\n`);
console.log("Continuar? Aplique a migration:");
console.log("  npx supabase db push --include-roles=false\n");
