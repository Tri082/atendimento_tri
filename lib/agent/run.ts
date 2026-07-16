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

/**
 * Às vezes o modelo, em vez de chamar `escalate_to_human` ou responder em
 * prosa normal, "vaza" um raciocínio interno em formato de objeto (ex:
 * {"can_escalate":false,"reason":"..."}) como se fosse a resposta final —
 * e isso ia direto pro WhatsApp do cliente. Detecta esse formato pra nunca
 * mandar pro cliente.
 */
function looksLikeRawStructuredOutput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Variante do vazamento acima: o modelo cola os argumentos de uma tool call
 * (ex: {"query":"..."}) direto na frente da resposta real, sem separador.
 * Diferente do caso "texto inteiro é JSON" (só isso, sem resposta pra
 * salvar — aí escalamos), aqui HÁ uma resposta válida na sequência, então só
 * removemos o prefixo em vez de jogar fora a resposta inteira.
 */
function stripLeadingToolCallJson(text: string): string {
  if (!text.startsWith("{")) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(0, i + 1);
        const rest = text.slice(i + 1).trim();
        if (!rest) return text; // sem resposta real depois — deixa pro looksLikeRawStructuredOutput tratar
        try {
          JSON.parse(candidate);
          return rest;
        } catch {
          return text;
        }
      }
    }
  }
  return text;
}

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
    .select(
      "id, organization_id, contact_id, external_thread_id, handled_by, channel:channels!inner(id, type, name)",
    )
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

  const mode: "full" | "faq_only" = conv.handled_by === "human" ? "faq_only" : "full";

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
    const systemPrompt = buildSystemPrompt(promptSettings, ragBlock, mode);

    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body ?? "[mídia]",
    }));

    const allTools = buildTools({
      orgId,
      agentId,
      conversationId,
      contactId: conv.contact_id,
      supabase,
    });
    // escalate_to_human também disponível em faq_only: sem ele, uma conversa
    // que já passou pelo handoff do onboarding nunca mais consegue acender o
    // destaque de "aguardando atendente" (handled_by='human' nunca é
    // desfeito), mesmo que o cliente precise de humano de novo depois.
    const tools =
      mode === "faq_only"
        ? { search_knowledge_base: allTools.search_knowledge_base, escalate_to_human: allTools.escalate_to_human }
        : allTools;

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

    let responseText = result.text?.trim();

    if (responseText) {
      const stripped = stripLeadingToolCallJson(responseText);
      if (stripped !== responseText) {
        logError(
          "agent.run.leaked-tool-call-json-prefix",
          new Error(`Modelo colou argumentos de tool call antes da resposta real (prefixo removido): ${responseText.slice(0, 300)}`),
        );
        responseText = stripped;
      }
    }

    if (responseText && looksLikeRawStructuredOutput(responseText)) {
      logError(
        "agent.run.malformed-response",
        new Error(`Modelo retornou saída não-conversacional, escalando: ${responseText.slice(0, 500)}`),
      );

      await supabase
        .from("conversations")
        .update({ agent_status: "paused_handoff" })
        .eq("id", conversationId)
        .eq("organization_id", orgId);

      await supabase.from("tasks").insert({
        organization_id: orgId,
        contact_id: conv.contact_id,
        title: `Conversa escalada: resposta da IA malformada`,
        description: `A IA gerou uma saída não-conversacional (provável raciocínio interno vazado) em vez de responder ou chamar escalate_to_human. Texto bruto: ${responseText.slice(0, 500)}`,
        priority: "high",
        status: "pending",
      });

      responseText = "Deixa eu confirmar uma coisa com nosso time e já te retorno por aqui, tá bom?";
    }

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

    // Se o agente já chamou escalate_to_human nesse turno, a mensagem de
    // handoff pro cliente já foi enviada de forma determinística pela
    // própria tool (ver lib/agent/tools/escalate.ts). Não insere/envia
    // `responseText` de novo aqui — mesmo que o modelo não tenha seguido à
    // risca a instrução de não mandar mais nada, isso evitaria o cliente
    // receber DUAS mensagens seguidas.
    const escalatedThisTurn = (result.steps ?? []).some((s) =>
      (s.toolCalls ?? []).some((tc) => tc.toolName === "escalate_to_human"),
    );

    if (!escalatedThisTurn) {
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
