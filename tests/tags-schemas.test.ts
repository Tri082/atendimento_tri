import { describe, expect, test } from "vitest";
import {
  applyTagSchema,
  createTagSchema,
  deleteTagSchema,
  ignoreSuggestionSchema,
  promoteSuggestionSchema,
  removeTagSchema,
  tagColorSchema,
  tagNameSchema,
  tagScopeSchema,
  updateTagSchema,
} from "@/lib/tags/schemas";

describe("tagScopeSchema", () => {
  test("aceita os 4 valores válidos", () => {
    for (const v of ["conversation", "contact", "company", "deal"] as const) {
      expect(tagScopeSchema.safeParse(v).success).toBe(true);
    }
  });
  test("rejeita valor fora do enum", () => {
    expect(tagScopeSchema.safeParse("task").success).toBe(false);
    expect(tagScopeSchema.safeParse("").success).toBe(false);
  });
});

describe("tagColorSchema", () => {
  test("aceita hex válido", () => {
    expect(tagColorSchema.safeParse("#52d12f").success).toBe(true);
    expect(tagColorSchema.safeParse("#ABCDEF").success).toBe(true);
  });
  test("rejeita formato inválido", () => {
    expect(tagColorSchema.safeParse("52d12f").success).toBe(false);
    expect(tagColorSchema.safeParse("#52d12").success).toBe(false);
    expect(tagColorSchema.safeParse("#52d12fff").success).toBe(false);
    expect(tagColorSchema.safeParse("rgb(0,0,0)").success).toBe(false);
  });
});

describe("tagNameSchema", () => {
  test("aceita nome de 1 a 40 chars", () => {
    expect(tagNameSchema.safeParse("a").success).toBe(true);
    expect(tagNameSchema.safeParse("a".repeat(40)).success).toBe(true);
  });
  test("rejeita vazio ou >40 chars", () => {
    expect(tagNameSchema.safeParse("").success).toBe(false);
    expect(tagNameSchema.safeParse("a".repeat(41)).success).toBe(false);
  });
});

describe("createTagSchema", () => {
  const baseValid = {
    orgSlug: "minha-org",
    name: "VIP",
    color: "#52d12f",
    appliesTo: ["contact", "deal"] as const,
  };
  test("aceita input válido", () => {
    const r = createTagSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.appliesTo).toEqual(["contact", "deal"]);
  });
  test("rejeita appliesTo vazio", () => {
    const r = createTagSchema.safeParse({ ...baseValid, appliesTo: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain("pelo menos um lugar");
    }
  });
  test("rejeita escopo inválido", () => {
    const r = createTagSchema.safeParse({
      ...baseValid,
      appliesTo: ["contact", "task"],
    });
    expect(r.success).toBe(false);
  });
  test("rejeita orgSlug vazio", () => {
    const r = createTagSchema.safeParse({ ...baseValid, orgSlug: "" });
    expect(r.success).toBe(false);
  });
  test("rejeita name >40 chars", () => {
    const r = createTagSchema.safeParse({ ...baseValid, name: "a".repeat(41) });
    expect(r.success).toBe(false);
  });
});

describe("updateTagSchema", () => {
  const baseValid = {
    orgSlug: "minha-org",
    id: "00000000-0000-4000-8000-000000000001",
  };
  test("aceita só id+orgSlug (sem nenhum patch)", () => {
    expect(updateTagSchema.safeParse(baseValid).success).toBe(true);
  });
  test("aceita patch parcial de nome", () => {
    expect(
      updateTagSchema.safeParse({ ...baseValid, name: "Novo nome" }).success,
    ).toBe(true);
  });
  test("aceita patch de appliesTo válido", () => {
    expect(
      updateTagSchema.safeParse({ ...baseValid, appliesTo: ["conversation"] })
        .success,
    ).toBe(true);
  });
  test("rejeita id não-uuid", () => {
    expect(updateTagSchema.safeParse({ ...baseValid, id: "abc" }).success).toBe(
      false,
    );
  });
  test("rejeita appliesTo vazio quando passado", () => {
    expect(
      updateTagSchema.safeParse({ ...baseValid, appliesTo: [] }).success,
    ).toBe(false);
  });
});

describe("deleteTagSchema", () => {
  test("aceita orgSlug + id válido", () => {
    expect(
      deleteTagSchema.safeParse({
        orgSlug: "minha-org",
        id: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
  test("rejeita id não-uuid", () => {
    expect(
      deleteTagSchema.safeParse({ orgSlug: "minha-org", id: "abc" }).success,
    ).toBe(false);
  });
});

describe("applyTagSchema", () => {
  const baseValid = {
    orgSlug: "minha-org",
    tagId: "00000000-0000-4000-8000-000000000001",
    entityId: "00000000-0000-4000-8000-000000000002",
  };
  test("aceita input válido sem propagateToContact", () => {
    expect(applyTagSchema.safeParse(baseValid).success).toBe(true);
  });
  test("aceita propagateToContact=true", () => {
    expect(
      applyTagSchema.safeParse({ ...baseValid, propagateToContact: true })
        .success,
    ).toBe(true);
  });
  test("aceita propagateToContact=false", () => {
    expect(
      applyTagSchema.safeParse({ ...baseValid, propagateToContact: false })
        .success,
    ).toBe(true);
  });
  test("rejeita tagId não-uuid", () => {
    expect(
      applyTagSchema.safeParse({ ...baseValid, tagId: "abc" }).success,
    ).toBe(false);
  });
  test("rejeita entityId não-uuid", () => {
    expect(
      applyTagSchema.safeParse({ ...baseValid, entityId: "abc" }).success,
    ).toBe(false);
  });
});

describe("removeTagSchema", () => {
  test("aceita input válido", () => {
    expect(
      removeTagSchema.safeParse({
        orgSlug: "minha-org",
        tagId: "00000000-0000-4000-8000-000000000001",
        entityId: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
  });
});

describe("promoteSuggestionSchema", () => {
  const baseValid = {
    orgSlug: "minha-org",
    suggestionId: "00000000-0000-4000-8000-000000000001",
    color: "#52d12f",
    appliesTo: ["contact", "deal"],
  };
  test("aceita input válido", () => {
    expect(promoteSuggestionSchema.safeParse(baseValid).success).toBe(true);
  });
  test("rejeita appliesTo vazio", () => {
    expect(
      promoteSuggestionSchema.safeParse({ ...baseValid, appliesTo: [] })
        .success,
    ).toBe(false);
  });
  test("rejeita color sem #", () => {
    expect(
      promoteSuggestionSchema.safeParse({ ...baseValid, color: "52d12f" })
        .success,
    ).toBe(false);
  });
});

describe("ignoreSuggestionSchema", () => {
  test("aceita input válido", () => {
    expect(
      ignoreSuggestionSchema.safeParse({
        orgSlug: "minha-org",
        suggestionId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
});
