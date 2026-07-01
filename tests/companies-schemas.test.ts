import { describe, expect, test } from "vitest";
import {
  createCompanySchema,
  deleteCompanySchema,
  updateCompanySchema,
} from "@/lib/companies/schemas";

describe("createCompanySchema", () => {
  test("accepts minimal valid input", () => {
    const r = createCompanySchema.safeParse({ orgSlug: "acme", name: "Acme S.A." });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createCompanySchema.safeParse({ orgSlug: "acme", name: "" });
    expect(r.success).toBe(false);
  });

  test("accepts notes", () => {
    const r = createCompanySchema.safeParse({
      orgSlug: "acme",
      name: "Acme",
      notes: "Reunião com sócio",
    });
    expect(r.success).toBe(true);
  });
});

describe("updateCompanySchema", () => {
  test("requires id", () => {
    const r = updateCompanySchema.safeParse({ orgSlug: "acme", name: "X" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateCompanySchema.safeParse({
      orgSlug: "acme",
      id: "11111111-1111-1111-1111-111111111111",
      notes: "atualizando",
    });
    expect(r.success).toBe(true);
  });
});

describe("deleteCompanySchema", () => {
  test("rejects non-uuid", () => {
    const r = deleteCompanySchema.safeParse({ orgSlug: "acme", id: "no" });
    expect(r.success).toBe(false);
  });
});
