import { ONBOARDING_STEPS, type OnboardingAnswers, type OnboardingStepId } from "./script";

export type OnboardingUserInput =
  | { kind: "text"; text: string }
  | { kind: "button"; optionId: string };

export type AdvanceResult =
  | { ok: true; nextStepId: OnboardingStepId; answers: OnboardingAnswers; handoff: boolean }
  | { ok: false };

function isValidOption(stepId: OnboardingStepId, optionId: string): boolean {
  const options = ONBOARDING_STEPS[stepId].options ?? [];
  return options.some((o) => o.id === optionId);
}

/**
 * Transição pura e síncrona do roteiro. NUNCA chama LLM ou I/O — resolução
 * de texto livre em opção (via matching determinístico ou LLM) acontece
 * ANTES desta função, na camada de serviço (`interpret.ts` + `service.ts`),
 * que já entrega um input `{kind:"button"}` resolvido pra steps de choice.
 */
export function advanceOnboarding(
  currentStepId: OnboardingStepId,
  input: OnboardingUserInput,
  answers: OnboardingAnswers,
): AdvanceResult {
  switch (currentStepId) {
    case "greeting_name": {
      if (input.kind !== "text" || !input.text.trim()) return { ok: false };
      return {
        ok: true,
        nextStepId: "first_order_check",
        answers: { ...answers, name: input.text.trim() },
        handoff: false,
      };
    }

    case "first_order_check": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      const isFirstOrder = input.optionId === "sim";
      return {
        ok: true,
        nextStepId: isFirstOrder ? "source" : "repeat_layout_check",
        answers: { ...answers, isFirstOrder },
        handoff: false,
      };
    }

    case "source": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      return {
        ok: true,
        nextStepId: input.optionId === "indicacao" ? "referred_by" : "use_case",
        answers: { ...answers, source: input.optionId },
        handoff: false,
      };
    }

    case "referred_by": {
      if (input.kind !== "text" || !input.text.trim()) return { ok: false };
      return {
        ok: true,
        nextStepId: "use_case",
        answers: { ...answers, referredBy: input.text.trim() },
        handoff: false,
      };
    }

    case "use_case": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      return {
        ok: true,
        nextStepId: "layout_status",
        answers: { ...answers, useCase: input.optionId },
        handoff: false,
      };
    }

    case "layout_status": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      return {
        ok: true,
        nextStepId: "files_status",
        answers: { ...answers, layoutStatus: input.optionId },
        handoff: false,
      };
    }

    case "files_status": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      return {
        ok: true,
        nextStepId: "completed",
        answers: { ...answers, filesStatus: input.optionId },
        handoff: true,
      };
    }

    case "repeat_layout_check": {
      if (input.kind !== "button" || !isValidOption(currentStepId, input.optionId)) {
        return { ok: false };
      }
      return {
        ok: true,
        nextStepId: "completed",
        answers: { ...answers, repeatLayoutChange: input.optionId },
        handoff: true,
      };
    }

    case "completed":
      return { ok: false };
  }
}
