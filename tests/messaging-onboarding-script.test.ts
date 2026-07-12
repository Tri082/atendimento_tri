import { describe, expect, test } from "vitest";
import { getGreeting, ONBOARDING_STEPS, MAX_BUTTON_OPTIONS } from "@/lib/messaging/onboarding/script";

describe("getGreeting", () => {
  test("manhã retorna Bom dia", () => {
    expect(getGreeting(new Date("2026-07-12T08:00:00-03:00"))).toBe("Bom dia");
  });
  test("tarde retorna Boa tarde", () => {
    expect(getGreeting(new Date("2026-07-12T14:00:00-03:00"))).toBe("Boa tarde");
  });
  test("noite retorna Boa noite", () => {
    expect(getGreeting(new Date("2026-07-12T20:00:00-03:00"))).toBe("Boa noite");
  });
  test("madrugada retorna Boa noite", () => {
    expect(getGreeting(new Date("2026-07-12T02:00:00-03:00"))).toBe("Boa noite");
  });
});

describe("ONBOARDING_STEPS", () => {
  test("greeting_name é step de texto e pergunta o nome", () => {
    const step = ONBOARDING_STEPS.greeting_name;
    expect(step.kind).toBe("text");
    expect(step.question({})).toContain("com quem eu teclo");
  });

  test("first_order_check tem 2 opções sim/não", () => {
    const step = ONBOARDING_STEPS.first_order_check;
    expect(step.kind).toBe("choice");
    expect(step.options?.map((o) => o.id).sort()).toEqual(["nao", "sim"]);
  });

  test("source tem 5 opções (acima do limite de botão)", () => {
    const step = ONBOARDING_STEPS.source;
    expect(step.options).toHaveLength(5);
    expect(step.options!.length).toBeGreaterThan(MAX_BUTTON_OPTIONS);
    expect(step.options!.map((o) => o.id)).toContain("indicacao");
  });

  test("files_status tem exatamente 3 opções (cabe em botão)", () => {
    const step = ONBOARDING_STEPS.files_status;
    expect(step.options).toHaveLength(3);
    expect(step.options!.length).toBeLessThanOrEqual(MAX_BUTTON_OPTIONS);
  });

  test("todos os steps de choice têm ao menos 2 opções únicas", () => {
    for (const step of Object.values(ONBOARDING_STEPS)) {
      if (step.kind !== "choice") continue;
      const ids = step.options!.map((o) => o.id);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
