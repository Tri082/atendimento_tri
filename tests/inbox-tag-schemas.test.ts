import { describe, expect, test } from "vitest";
import {
  createTagInputSchema,
  updateTagInputSchema,
  convTagInputSchema,
} from "@/lib/messaging/tags/schemas";

const UID = "11111111-1111-1111-1111-111111111111";

describe("createTagInputSchema", () => {
  test("aceita válido", () => {
    expect(createTagInputSchema.safeParse({
      orgSlug: "acme", name: "VIP", color: "#00ff00",
    }).success).toBe(true);
  });
  test("rejeita cor inválida", () => {
    expect(createTagInputSchema.safeParse({
      orgSlug: "acme", name: "VIP", color: "verde",
    }).success).toBe(false);
  });
  test("rejeita name vazio", () => {
    expect(createTagInputSchema.safeParse({
      orgSlug: "acme", name: "", color: "#000000",
    }).success).toBe(false);
  });
});

describe("updateTagInputSchema", () => {
  test("aceita apenas name", () => {
    expect(updateTagInputSchema.safeParse({
      orgSlug: "acme", tagId: UID, name: "Novo",
    }).success).toBe(true);
  });
  test("rejeita sem name nem color", () => {
    expect(updateTagInputSchema.safeParse({
      orgSlug: "acme", tagId: UID,
    }).success).toBe(false);
  });
});

describe("convTagInputSchema", () => {
  test("aceita UUIDs válidos", () => {
    expect(convTagInputSchema.safeParse({
      orgSlug: "acme", conversationId: UID, tagId: UID,
    }).success).toBe(true);
  });
});
