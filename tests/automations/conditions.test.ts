import { describe, expect, test } from "vitest";
import { evaluateConditions, evaluateSingleCondition } from "@/lib/automations/conditions";
import { resolvePath } from "@/lib/automations/path";

const ctx = {
  contact: { name: "João", email: "j@x.com", phone: null },
  deal: { value: 1500, stage: "proposal_sent" },
  channel: { type: "whatsapp_cloud" },
  tags: ["lead", "vip"],
};

describe("evaluateSingleCondition", () => {
  test("eq", async () => {
    expect(
      await evaluateSingleCondition({ field: "deal.stage", op: "eq", value: "proposal_sent" }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "deal.stage", op: "eq", value: "won" }, ctx),
    ).toBe(false);
  });
  test("ne", async () => {
    expect(
      await evaluateSingleCondition({ field: "deal.stage", op: "ne", value: "won" }, ctx),
    ).toBe(true);
  });
  test("gt/gte/lt/lte com number", async () => {
    expect(
      await evaluateSingleCondition({ field: "deal.value", op: "gt", value: 1000 }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "deal.value", op: "gte", value: 1500 }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "deal.value", op: "lte", value: 1500 }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "deal.value", op: "lt", value: 1500 }, ctx),
    ).toBe(false);
  });
  test("contains em string", async () => {
    expect(
      await evaluateSingleCondition({ field: "contact.email", op: "contains", value: "@x" }, ctx),
    ).toBe(true);
  });
  test("not_contains", async () => {
    expect(
      await evaluateSingleCondition(
        { field: "contact.email", op: "not_contains", value: "@y" },
        ctx,
      ),
    ).toBe(true);
  });
  test("in / not_in", async () => {
    expect(
      await evaluateSingleCondition(
        { field: "channel.type", op: "in", value: ["whatsapp_cloud", "telegram"] },
        ctx,
      ),
    ).toBe(true);
    expect(
      await evaluateSingleCondition(
        { field: "channel.type", op: "not_in", value: ["telegram"] },
        ctx,
      ),
    ).toBe(true);
  });
  test("is_empty / is_not_empty", async () => {
    expect(
      await evaluateSingleCondition({ field: "contact.phone", op: "is_empty" }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "naoexiste", op: "is_empty" }, ctx),
    ).toBe(true);
    expect(
      await evaluateSingleCondition({ field: "contact.email", op: "is_not_empty" }, ctx),
    ).toBe(true);
  });
  test("contains em array (tags)", async () => {
    expect(
      await evaluateSingleCondition({ field: "tags", op: "contains", value: "lead" }, ctx),
    ).toBe(true);
  });
  test("path inexistente: eq → false, ne → true", async () => {
    expect(
      await evaluateSingleCondition({ field: "naoexiste", op: "eq", value: "x" }, ctx),
    ).toBe(false);
    expect(
      await evaluateSingleCondition({ field: "naoexiste", op: "ne", value: "x" }, ctx),
    ).toBe(true);
  });
  test("gt com tipos misturados (string vs number) retorna false sem throw", async () => {
    expect(
      await evaluateSingleCondition({ field: "contact.name", op: "gt", value: 10 }, ctx),
    ).toBe(false);
    expect(
      await evaluateSingleCondition({ field: "deal.value", op: "gt", value: "10" }, ctx),
    ).toBe(false);
  });
  test("path com espaços nos dots é tolerado", async () => {
    expect(
      await evaluateSingleCondition(
        { field: "contact . name", op: "eq", value: "João" },
        ctx,
      ),
    ).toBe(true);
  });
  test("has_tag sem orgId no ctx retorna false (fail-closed)", async () => {
    expect(
      await evaluateSingleCondition(
        { field: "contact.has_tag", op: "has_tag", value: "00000000-0000-4000-8000-000000000020" },
        { contact: { id: "00000000-0000-4000-8000-000000000010" } },
      ),
    ).toBe(false);
  });
  test("lacks_tag sem orgId no ctx retorna true (fail-closed)", async () => {
    expect(
      await evaluateSingleCondition(
        { field: "contact.lacks_tag", op: "lacks_tag", value: "00000000-0000-4000-8000-000000000020" },
        { contact: { id: "00000000-0000-4000-8000-000000000010" } },
      ),
    ).toBe(true);
  });
});

describe("resolvePath (Sub-H Round-2 #10)", () => {
  test("path com dots duplos retorna undefined (não trunca silenciosamente)", () => {
    expect(resolvePath({ a: { b: "x" } }, "a..b")).toBeUndefined();
  });
  test("path vazio retorna undefined", () => {
    expect(resolvePath({ a: 1 }, "")).toBeUndefined();
  });
  test("path só com dots retorna undefined", () => {
    expect(resolvePath({ a: 1 }, "...")).toBeUndefined();
  });
});

describe("evaluateConditions (AND)", () => {
  test("sem conditions: passa", async () => {
    expect((await evaluateConditions([], ctx)).pass).toBe(true);
  });
  test("todas passam", async () => {
    const r = await evaluateConditions(
      [
        { field: "deal.value", op: "gt", value: 1000 },
        { field: "contact.name", op: "eq", value: "João" },
      ],
      ctx,
    );
    expect(r.pass).toBe(true);
  });
  test("uma falha: failedAt + reason", async () => {
    const r = await evaluateConditions(
      [
        { field: "deal.value", op: "gt", value: 1000 },
        { field: "contact.name", op: "eq", value: "Outro" },
      ],
      ctx,
    );
    expect(r.pass).toBe(false);
    expect(r.failedAt).toBe(1);
    expect(r.reason).toContain("contact.name");
  });
});
