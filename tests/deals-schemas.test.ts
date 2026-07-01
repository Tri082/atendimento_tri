import { describe, expect, test } from "vitest";
import {
  createDealSchema,
  deleteDealSchema,
  linkDealContactSchema,
  moveDealStageSchema,
  updateDealSchema,
} from "@/lib/deals/schemas";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("createDealSchema", () => {
  test("requires companyId and name", () => {
    expect(createDealSchema.safeParse({ orgSlug: "x", name: "Y" }).success).toBe(false);
    expect(createDealSchema.safeParse({ orgSlug: "x", companyId: UUID, name: "" }).success).toBe(
      false,
    );
  });

  test("accepts minimal valid input", () => {
    const r = createDealSchema.safeParse({
      orgSlug: "x",
      companyId: UUID,
      name: "Reestruturação 2026",
    });
    expect(r.success).toBe(true);
  });

  test("accepts value as number", () => {
    const r = createDealSchema.safeParse({
      orgSlug: "x",
      companyId: UUID,
      name: "Projeto",
      value: 50000,
    });
    expect(r.success).toBe(true);
  });

  test("rejects negative value", () => {
    const r = createDealSchema.safeParse({
      orgSlug: "x",
      companyId: UUID,
      name: "Projeto",
      value: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("moveDealStageSchema", () => {
  test("accepts won", () => {
    expect(moveDealStageSchema.safeParse({ orgSlug: "x", id: UUID, stage: "won" }).success).toBe(
      true,
    );
  });
  test("rejects bogus", () => {
    expect(moveDealStageSchema.safeParse({ orgSlug: "x", id: UUID, stage: "nope" }).success).toBe(
      false,
    );
  });
});

describe("updateDealSchema", () => {
  test("accepts lost_reason", () => {
    const r = updateDealSchema.safeParse({
      orgSlug: "x",
      id: UUID,
      lostReason: "Preço",
    });
    expect(r.success).toBe(true);
  });
});

describe("linkDealContactSchema", () => {
  test("requires both ids", () => {
    expect(linkDealContactSchema.safeParse({ orgSlug: "x", dealId: UUID }).success).toBe(false);
    expect(
      linkDealContactSchema.safeParse({ orgSlug: "x", dealId: UUID, contactId: UUID }).success,
    ).toBe(true);
  });
});

describe("deleteDealSchema", () => {
  test("rejects non-uuid id", () => {
    expect(deleteDealSchema.safeParse({ orgSlug: "x", id: "no" }).success).toBe(false);
  });
});
