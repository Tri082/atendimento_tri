import { describe, expect, test } from "vitest";
import { automationSchema, conditionSchema, automationActionSchema } from "@/lib/automations/schemas";

describe("automationSchema", () => {
  test("válida sem defaults — exige todos os campos críticos", () => {
    const r = automationSchema.safeParse({
      name: "Teste",
      trigger_type: "conversation.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_contact", config: {}, on_error: "stop" }],
      status: "draft",
    });
    expect(r.success).toBe(true);
  });
  test("name vazio rejeitado", () => {
    expect(automationSchema.safeParse({
      name: "", trigger_type: "x", trigger_config: {}, conditions: [],
      actions: [{ type: "y", config: {}, on_error: "stop" }], status: "draft",
    }).success).toBe(false);
  });
  test("actions vazio rejeitado", () => {
    expect(automationSchema.safeParse({
      name: "X", trigger_type: "y", trigger_config: {}, conditions: [], actions: [], status: "draft",
    }).success).toBe(false);
  });
  test("21 actions rejeitado (max 20)", () => {
    expect(automationSchema.safeParse({
      name: "X", trigger_type: "y", trigger_config: {}, conditions: [],
      actions: Array.from({ length: 21 }, () => ({ type: "z", config: {}, on_error: "stop" as const })),
      status: "draft",
    }).success).toBe(false);
  });
  test("11 conditions rejeitado (max 10)", () => {
    expect(automationSchema.safeParse({
      name: "X", trigger_type: "y", trigger_config: {},
      conditions: Array.from({ length: 11 }, () => ({ field: "x", op: "is_empty" as const })),
      actions: [{ type: "z", config: {}, on_error: "stop" as const }], status: "draft",
    }).success).toBe(false);
  });
});

describe("conditionSchema", () => {
  test("op inválido rejeitado", () => {
    expect(conditionSchema.safeParse({ field: "x", op: "regex" }).success).toBe(false);
  });
  test("is_empty sem value é OK", () => {
    expect(conditionSchema.safeParse({ field: "x", op: "is_empty" }).success).toBe(true);
  });
});

describe("automationActionSchema", () => {
  test("on_error obrigatório agora (sem default)", () => {
    expect(automationActionSchema.safeParse({ type: "x", config: {} }).success).toBe(false);
    expect(automationActionSchema.safeParse({ type: "x", config: {}, on_error: "stop" }).success).toBe(true);
  });
});
