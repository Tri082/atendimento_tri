import { describe, expect, test } from "vitest";
import { reprocessDocumentInputSchema } from "@/lib/agent/documents/schemas";

const UID = "11111111-1111-1111-1111-111111111111";
const AID = "22222222-2222-2222-2222-222222222222";

describe("reprocessDocumentInputSchema", () => {
  test("aceita input válido", () => {
    const r = reprocessDocumentInputSchema.safeParse({
      orgSlug: "minha-org",
      agentId: AID,
      documentId: UID,
    });
    expect(r.success).toBe(true);
  });

  test("rejeita agentId não-UUID", () => {
    const r = reprocessDocumentInputSchema.safeParse({
      orgSlug: "minha-org",
      agentId: "nao-uuid",
      documentId: UID,
    });
    expect(r.success).toBe(false);
  });

  test("rejeita documentId não-UUID", () => {
    const r = reprocessDocumentInputSchema.safeParse({
      orgSlug: "minha-org",
      agentId: AID,
      documentId: "nao-uuid",
    });
    expect(r.success).toBe(false);
  });

  test("rejeita orgSlug vazio", () => {
    const r = reprocessDocumentInputSchema.safeParse({
      orgSlug: "",
      agentId: AID,
      documentId: UID,
    });
    expect(r.success).toBe(false);
  });
});
