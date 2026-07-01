import { describe, expect, test } from "vitest";
import {
  createContactSchema,
  deleteContactSchema,
  updateContactSchema,
} from "@/lib/contacts/schemas";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("createContactSchema", () => {
  test("accepts minimal valid input", () => {
    const r = createContactSchema.safeParse({ orgSlug: "x", name: "João" });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createContactSchema.safeParse({ orgSlug: "x", name: "" });
    expect(r.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const r = createContactSchema.safeParse({
      orgSlug: "x",
      name: "João",
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  test("accepts empty email", () => {
    const r = createContactSchema.safeParse({ orgSlug: "x", name: "João", email: "" });
    expect(r.success).toBe(true);
  });

  test("accepts companyId and title", () => {
    const r = createContactSchema.safeParse({
      orgSlug: "x",
      name: "João",
      title: "CFO",
      companyId: UUID,
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid companyId", () => {
    const r = createContactSchema.safeParse({
      orgSlug: "x",
      name: "João",
      companyId: "no",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  test("requires id", () => {
    const r = updateContactSchema.safeParse({ orgSlug: "x", name: "Y" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update with companyId null (clear company)", () => {
    const r = updateContactSchema.safeParse({
      orgSlug: "x",
      id: UUID,
      companyId: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("deleteContactSchema", () => {
  test("rejects non-uuid", () => {
    expect(deleteContactSchema.safeParse({ orgSlug: "x", id: "no" }).success).toBe(false);
  });
});
