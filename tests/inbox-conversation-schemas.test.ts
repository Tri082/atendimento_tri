import { describe, expect, test } from "vitest";
import {
  assignConvInputSchema,
  resolveConvInputSchema,
  promoteContactInputSchema,
  uploadMediaInputSchema,
} from "@/lib/messaging/conversations/schemas";

const UID = "11111111-1111-1111-1111-111111111111";

describe("assignConvInputSchema", () => {
  test("aceita userId UUID", () => {
    expect(assignConvInputSchema.safeParse({
      orgSlug: "x", conversationId: UID, userId: UID,
    }).success).toBe(true);
  });
  test("aceita userId null (unassign)", () => {
    expect(assignConvInputSchema.safeParse({
      orgSlug: "x", conversationId: UID, userId: null,
    }).success).toBe(true);
  });
});

describe("resolveConvInputSchema", () => {
  test("aceita resolved=true", () => {
    expect(resolveConvInputSchema.safeParse({
      orgSlug: "x", conversationId: UID, resolved: true,
    }).success).toBe(true);
  });
});

describe("promoteContactInputSchema", () => {
  test("mode=link com contactId", () => {
    expect(promoteContactInputSchema.safeParse({
      mode: "link", orgSlug: "x", conversationId: UID, contactId: UID,
    }).success).toBe(true);
  });
  test("mode=create com nome obrigatório", () => {
    expect(promoteContactInputSchema.safeParse({
      mode: "create", orgSlug: "x", conversationId: UID, name: "João",
    }).success).toBe(true);
  });
  test("mode=link sem contactId falha", () => {
    expect(promoteContactInputSchema.safeParse({
      mode: "link", orgSlug: "x", conversationId: UID,
    }).success).toBe(false);
  });
  test("mode=create sem nome falha", () => {
    expect(promoteContactInputSchema.safeParse({
      mode: "create", orgSlug: "x", conversationId: UID,
    }).success).toBe(false);
  });
});

describe("uploadMediaInputSchema", () => {
  test("aceita imagem", () => {
    expect(uploadMediaInputSchema.safeParse({
      orgSlug: "x", conversationId: UID,
      fileBase64: "iVBORw0K...",
      mimeType: "image/png",
      filename: "foto.png",
    }).success).toBe(true);
  });
});
