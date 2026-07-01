import { describe, expect, test } from "vitest";
import {
  uploadDocumentInputSchema,
  deleteDocumentInputSchema,
} from "@/lib/agent/documents/schemas";

const UID = "11111111-1111-1111-1111-111111111111";
const AID = "22222222-2222-2222-2222-222222222222";

describe("uploadDocumentInputSchema", () => {
  test("aceita PDF", () => {
    expect(uploadDocumentInputSchema.safeParse({
      orgSlug: "x", agentId: AID, filename: "manual.pdf", fileBase64: "JVBERi0...", mimeType: "application/pdf",
    }).success).toBe(true);
  });
  test("rejeita filename vazio", () => {
    expect(uploadDocumentInputSchema.safeParse({
      orgSlug: "x", agentId: AID, filename: "", fileBase64: "a", mimeType: "application/pdf",
    }).success).toBe(false);
  });
});

describe("deleteDocumentInputSchema", () => {
  test("aceita", () => {
    expect(deleteDocumentInputSchema.safeParse({
      orgSlug: "x", agentId: AID, documentId: UID,
    }).success).toBe(true);
  });
});
