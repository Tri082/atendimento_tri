import { describe, expect, it } from "vitest";
import { findPlaceholderPaths } from "@/lib/automations/placeholders";

describe("findPlaceholderPaths", () => {
  it("detecta PREENCHA_* em config", () => {
    const actions = [
      { type: "create_contact", config: { name: "Lead" }, on_error: "stop" },
      {
        type: "create_deal",
        config: { name: "Novo", stage: "new", company_id: "PREENCHA_UUID_DA_EMPRESA" },
        on_error: "continue",
      },
    ];
    expect(findPlaceholderPaths(actions)).toEqual([
      { actionIndex: 1, key: "company_id", value: "PREENCHA_UUID_DA_EMPRESA" },
    ]);
  });

  it("detecta TROQUE_ESTE_SECRETO e SEU_HOOK_AQUI", () => {
    const actions = [
      {
        type: "call_webhook",
        config: {
          url: "https://hooks.zapier.com/SEU_HOOK_AQUI",
          webhook_secret: "TROQUE_ESTE_SECRETO_LONGO_DE_32_CHARS_NO_MINIMO",
        },
        on_error: "stop",
      },
    ];
    const found = findPlaceholderPaths(actions);
    expect(found).toHaveLength(2);
    expect(found.map((f) => f.key).sort()).toEqual(["url", "webhook_secret"]);
  });

  it("retorna array vazio quando não tem placeholder", () => {
    const actions = [
      { type: "create_task", config: { title: "Ligar pro cliente", priority: "medium" }, on_error: "continue" },
    ];
    expect(findPlaceholderPaths(actions)).toEqual([]);
  });

  it("ignora valores que não são string", () => {
    const actions = [
      { type: "create_deal", config: { name: "X", stage: "new", value: 100, company_id: "uuid-real" }, on_error: "stop" },
    ];
    expect(findPlaceholderPaths(actions)).toEqual([]);
  });
});
