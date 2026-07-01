import { generateText, stepCountIs, type ModelMessage } from "ai";
import { getLanguageModel } from "@/lib/llm";
import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { processSendOutbound } from "@/lib/messaging/router";
import { after } from "next/server";
import { buildSystemPrompt, type PromptSettings } from "./prompts/build";
import { formatRagBlock, retrieveContext } from "./rag/retrieve";
import { buildTools } from "./tools";

const HISTORY_WINDOW = 20;
const ESTIMATED_TOKENS = 6000;
const MAX_STEPS = 5;
const MAX_OUTPUT_TOKENS = 1024;

interface RunContext {
  orgId: string;
  agentId: string;
  conversationId: string;
}

export async function runAgent({ orgId, agentId, conversationId }: RunContext): Promise<void> {
  const supabase = createServiceClient();

  // 1. Load conversation + canal + contato
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, organization_id, contact_id, external_thread_id, channel:channels!inner(id, type, name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return;

  // 2. Carrega config do agente
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!agent || !agent.is_active) return;

  const promptSettings: PromptSettings = {
    agent_name: agent.name,
    company_name: agent.company_name,
    persona: agent.persona,
    goal: agent.goal,
    tone: agent.tone as PromptSettings["tone"],
    never_do: agent.never_do,
  };

  // 3. Cost cap por agente
  const { data: withinCap } = await supabase.rpc("consume_agent_tokens", {
    _agent_id: agentId,
    _tokens: ESTIMATED_TOKENS,
  });

  if (withinCap === false) {
    await supabase.from("tasks").insert({
      organization_id: orgId,
      contact_id: conv.contact_id,
      title: `Cota do agente "${agent.name}" atingida — conversa aguarda resposta`,
      description: `Conversa: ${conv.external_thread_id}`,
      priority: "high",
      status: "pending",
    });
    return;
  }

  // 4. Histórico
  const { data: msgs } = await supabase
    .from("messages")
    .select("body, direction, sender_kind, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_WINDOW);

  const history = (msgs ?? []).reverse();
  const lastInbound = [...history].reverse().find((m) => m.direction === "inbound");
  const queryForRag = lastInbound?.body ?? "";

  // 5. RAG retrieval — passa agentId
  const ragHits = queryForRag ? await retrieveContext(agentId, queryForRag, 5) : [];
  const ragBlock = formatRagBlock(ragHits);

  // 6. Cria agent_run "running" com agent_id
  const { data: runRow } = await supabase
    .from("agent_runs")
    .insert({
      organization_id: orgId,
      agent_id: agentId,
      conversation_id: conversationId,
      status: "running",
    })
    .select("id")
    .single();
  const runId = runRow?.id;

  const startedAt = Date.now();

  try {
    const systemPrompt = buildSystemPrompt(promptSettings, ragBlock);

    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body ?? "[mídia]",
    }));

    const tools = buildTools({
      orgId,
      agentId,
      conversationId,
      contactId: conv.contact_id,
      supabase,
    });

    const result = await generateText({
      model: getLanguageModel({
        provider: agent.llm_provider as "anthropic" | "openai",
        model: agent.llm_model,
      }),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    const responseText = result.text?.trim();
    if (!responseText) {
      if (runId) {
        await supabase
          .from("agent_runs")
          .update({
            status: "succeeded",
            prompt_tokens: result.usage?.inputTokens ?? 0,
            completion_tokens: result.usage?.outputTokens ?? 0,
            tools_called: result.steps?.flatMap((s) =>
              (s.toolCalls ?? []).map((tc) => ({ name: tc.toolName })),
            ) ?? [],
            finished_at: new Date().toISOString(),
          })
          .eq("id", runId);
      }
      return;
    }

    const { data: inserted } = await supabase
      .from("messages")
      .insert({
        organization_id: orgId,
        conversation_id: conversationId,
        direction: "outbound",
        sender_kind: "bot",
        sender_user_id: null,
        body: responseText,
        status: "sending",
      })
      .select("id")
      .single();

    if (inserted?.id) {
      after(() => processSendOutbound(inserted.id));
    }

    const realTokens = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);
    const delta = realTokens - ESTIMATED_TOKENS;
    if (delta !== 0) {
      await supabase.rpc("adjust_agent_tokens", { _agent_id: agentId, _delta: delta });
    }

    if (runId) {
      await supabase
        .from("agent_runs")
        .update({
          status: "succeeded",
          prompt_tokens: result.usage?.inputTokens ?? 0,
          completion_tokens: result.usage?.outputTokens ?? 0,
          tools_called: result.steps?.flatMap((s) =>
            (s.toolCalls ?? []).map((tc) => ({ name: tc.toolName })),
          ) ?? [],
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logError("agent.run", err);
    if (runId) {
      await supabase
        .from("agent_runs")
        .update({
          status: "failed",
          error_message: message.slice(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  } finally {
    console.log(`[agent.run] ${conversationId} (agent ${agentId}) took ${Date.now() - startedAt}ms`);
  }
}
