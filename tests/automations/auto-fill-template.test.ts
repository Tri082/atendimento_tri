import { describe, expect, it } from "vitest";
import { applyTemplateAutoFill } from "@/lib/automations/placeholders";

describe("applyTemplateAutoFill", () => {
  it("substitui webhook_secret placeholder por 32 chars aleatórios", () => {
    const input = {
      actions: [
        {
          type: "call_webhook",
          config: {
            url: "https://hooks.zapier.com/SEU_HOOK_AQUI",
            webhook_secret: "TROQUE_ESTE_SECRETO_LONGO_DE_32_CHARS_NO_MINIMO",
          },
          on_error: "stop",
        },
      ],
    };
    const out = applyTemplateAutoFill(input, { defaultCompanyId: null });
    const secret = out.actions[0]!.config.webhook_secret;
    expect(typeof secret).toBe("string");
    expect(secret).toHaveLength(64);
    expect(secret as string).toMatch(/^[0-9a-f]{64}$/);
    expect(secret).not.toBe("TROQUE_ESTE_SECRETO_LONGO_DE_32_CHARS_NO_MINIMO");
    // url continua placeholder (só auto-fill secret)
    expect(out.actions[0]!.config.url).toBe("https://hooks.zapier.com/SEU_HOOK_AQUI");
  });

  it("substitui company_id placeholder quando org tem 1 empresa", () => {
    const input = {
      actions: [
        {
          type: "create_deal",
          config: { name: "X", stage: "new", company_id: "PREENCHA_UUID_DA_EMPRESA" },
          on_error: "stop",
        },
      ],
    };
    const out = applyTemplateAutoFill(input, {
      defaultCompanyId: "11111111-1111-4111-8111-111111111111",
    });
    expect(out.actions[0]!.config.company_id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("mantém company_id placeholder quando org NÃO tem empresa única", () => {
    const input = {
      actions: [
        {
          type: "create_deal",
          config: { name: "X", stage: "new", company_id: "PREENCHA_UUID_DA_EMPRESA" },
          on_error: "stop",
        },
      ],
    };
    const out = applyTemplateAutoFill(input, { defaultCompanyId: null });
    expect(out.actions[0]!.config.company_id).toBe("PREENCHA_UUID_DA_EMPRESA");
  });

  it("preserva config sem placeholder", () => {
    const input = {
      actions: [
        { type: "create_task", config: { title: "X", priority: "low" }, on_error: "continue" },
      ],
    };
    const out = applyTemplateAutoFill(input, { defaultCompanyId: null });
    expect(out.actions[0]!.config.title).toBe("X");
    expect(out.actions[0]!.config.priority).toBe("low");
  });

  it("não muta config aninhado do input (deep clone)", () => {
    const nestedPayload = { event: "deal.won", deal_id: "{{deal.id}}" };
    const input = {
      actions: [
        {
          type: "call_webhook",
          config: {
            url: "https://hooks.example.com/abc",
            webhook_secret: "TROQUE_ESTE_SECRETO_LONGO_DE_32_CHARS_NO_MINIMO",
            payload: nestedPayload,
          },
          on_error: "stop",
        },
      ],
    };
    const out = applyTemplateAutoFill(input, { defaultCompanyId: null });
    // muta o payload do output → input.payload NÃO pode mudar (deep clone)
    (out.actions[0]!.config.payload as Record<string, unknown>).event = "MUTATED";
    expect(nestedPayload.event).toBe("deal.won");
  });
});
