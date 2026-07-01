import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/supabase";
import { evaluateConditions } from "./conditions";
import { AUTOMATION_LIMITS } from "./limits";
import { ACTIONS, TRIGGERS } from "./registry";
import type {
  AutomationAction,
  Condition,
  TriggerPayload,
} from "./schemas";
import { interpolate } from "./templating";

type RunStatus = Database["public"]["Tables"]["automation_runs"]["Row"]["status"];

/**
 * Monta o contexto inicial pra templating + conditions.
 * Espalha o payload do trigger + adiciona now (iso/date/time) + steps[] vazio.
 */
function mountContext(triggerPayload: Record<string, unknown>): Record<string, unknown> {
  const now = new Date();
  return {
    ...triggerPayload,
    now: {
      iso: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toISOString().slice(11, 19),
    },
    steps: [] as unknown[],
  };
}

/**
 * Executa uma run end-to-end.
 */
export async function runAutomation(runId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: run, error: runErr } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runErr || !run) {
    logError(
      "automations.engine.read-run",
      runErr ?? new Error(`run ${runId} não encontrada`),
    );
    return;
  }

  const { data: automation, error: autoErr } = await supabase
    .from("automations")
    .select("*")
    .eq("id", run.automation_id)
    .maybeSingle();
  if (autoErr || !automation) {
    await finishRun(supabase, run.id, "failed", "Automation não encontrada");
    return;
  }

  // Snapshot status check — pausada entre emit e run
  if (automation.status !== "active") {
    await finishRun(
      supabase,
      run.id,
      "skipped_conditions",
      "Automação foi pausada antes da execução",
    );
    return;
  }

  if (run.depth > AUTOMATION_LIMITS.MAX_RECURSION_DEPTH) {
    await finishRun(
      supabase,
      run.id,
      "skipped_recursion",
      `depth=${run.depth} excede limite`,
    );
    return;
  }

  const triggerPayload = (run.trigger_payload ?? {}) as TriggerPayload;
  const isDryRun = triggerPayload._meta?.dry_run === true;

  // Sub-H Round-2 #3: valida payload contra contextSchema do trigger (warning-only).
  // Não falha — alguns triggers (agent.escalated com channel vazio em tools) emitem
  // dados incompletos. Aluno vê warning nos logs server-side e algumas vars
  // podem vir vazias na interpolação.
  const triggerDef = TRIGGERS[automation.trigger_type];
  if (triggerDef) {
    const { _meta: _ignored, ...payloadForValidation } =
      triggerPayload as Record<string, unknown> & { _meta?: unknown };
    const schemaResult = triggerDef.contextSchema.safeParse(payloadForValidation);
    if (!schemaResult.success) {
      console.warn(
        `[automation:${run.id}] trigger_payload não bate contextSchema de ${automation.trigger_type}: ${schemaResult.error.issues[0]?.message ?? "schema fail"}. Continuando — algumas vars podem vir vazias.`,
      );
    }
  }

  const context = mountContext(triggerPayload);

  // Conditions
  const conditions = (automation.conditions ?? []) as Condition[];
  const conditionsResult = await evaluateConditions(conditions, context, {
    orgId: run.organization_id,
  });
  if (!conditionsResult.pass) {
    await finishRun(
      supabase,
      run.id,
      "skipped_conditions",
      conditionsResult.reason ?? "condição bloqueou",
    );
    return;
  }

  // Actions
  const actions = (automation.actions ?? []) as AutomationAction[];
  const stepOutputs: unknown[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action) continue; // TS strict guard

    const handler = ACTIONS[action.type];
    if (!handler) {
      await insertFailedStep(
        supabase,
        run.id,
        i,
        action.type,
        action.config,
        `Action ${action.type} não existe no registry`,
      );
      if (action.on_error === "stop") {
        await finishRun(
          supabase,
          run.id,
          "failed",
          `Action ${action.type} desconhecida`,
        );
        return;
      }
      stepOutputs.push(undefined);
      continue;
    }

    // Refresh context.steps
    context.steps = stepOutputs;

    // Interpolate input antes de validar
    const interpolated = interpolate(action.config, context);

    // Cria step row em pending → running
    const { data: stepRow, error: stepErr } = await supabase
      .from("automation_run_steps")
      .insert({
        run_id: run.id,
        step_index: i,
        action_type: action.type,
        input: (interpolated ?? {}) as Json,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (stepErr || !stepRow) {
      logError("automations.engine.insert-step", stepErr);
      await finishRun(supabase, run.id, "failed", "Falha ao gravar step");
      return;
    }

    // Valida via Zod
    const parsed = handler.inputSchema.safeParse(interpolated);
    if (!parsed.success) {
      const msg = `Entrada inválida: ${parsed.error.issues[0]?.message ?? "schema fail"}`;
      await markStep(supabase, stepRow.id, "failed", null, msg);
      if (action.on_error === "stop") {
        await finishRun(
          supabase,
          run.id,
          "failed",
          `Step ${i} (${action.type}): ${msg}`,
        );
        return;
      }
      stepOutputs.push(undefined);
      continue;
    }

    // Executa com timeout
    try {
      const promise = isDryRun
        ? handler.simulate(parsed.data)
        : handler.execute(parsed.data, {
            orgId: run.organization_id,
            depth: run.depth,
            runId: run.id,
          });
      const result = await runWithTimeout(
        promise,
        AUTOMATION_LIMITS.STEP_TIMEOUT_MS,
      );
      await markStep(
        supabase,
        stepRow.id,
        isDryRun ? "dry_run" : "completed",
        (result ?? null) as Json | null,
        null,
      );
      stepOutputs.push(result);
      // Sub-H L-1: log de sucesso removido — barulho em prod, status já consultável no DB
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markStep(supabase, stepRow.id, "failed", null, msg.slice(0, 1000));
      console.warn(
        `[automation:${run.id}] step ${i} (${action.type}) → failed: ${msg}`,
      );
      if (action.on_error === "stop") {
        await finishRun(
          supabase,
          run.id,
          "failed",
          `Step ${i} (${action.type}) falhou: ${msg.slice(0, 200)}`,
        );
        return;
      }
      stepOutputs.push(undefined);
    }
  }

  await finishRun(supabase, run.id, "completed", null);
}

function runWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`step timeout (${ms}ms)`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function finishRun(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  status: RunStatus,
  error: string | null,
): Promise<void> {
  await supabase
    .from("automation_runs")
    .update({ status, error, finished_at: new Date().toISOString() })
    .eq("id", runId);
}

async function markStep(
  supabase: ReturnType<typeof createServiceClient>,
  stepId: string,
  status: "completed" | "failed" | "dry_run",
  output: Json | null,
  error: string | null,
): Promise<void> {
  await supabase
    .from("automation_run_steps")
    .update({
      status,
      output: output ?? null,
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", stepId);
}

async function insertFailedStep(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  stepIndex: number,
  actionType: string,
  input: unknown,
  error: string,
): Promise<void> {
  await supabase.from("automation_run_steps").insert({
    run_id: runId,
    step_index: stepIndex,
    action_type: actionType,
    input: (input ?? {}) as Json,
    status: "failed",
    error,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });
}
