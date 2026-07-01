import { describe, expect, test } from "vitest";
import {
  createFaqInputSchema,
  updateFaqInputSchema,
  deleteFaqInputSchema,
} from "@/lib/agent/faq/schemas";

const UID = "11111111-1111-1111-1111-111111111111";
const AID = "22222222-2222-2222-2222-222222222222";

describe("createFaqInputSchema", () => {
  test("aceita Q+A válidas", () => {
    expect(createFaqInputSchema.safeParse({
      orgSlug: "x", agentId: AID, question: "P?", answer: "R.",
    }).success).toBe(true);
  });
  test("rejeita answer vazio", () => {
    expect(createFaqInputSchema.safeParse({
      orgSlug: "x", agentId: AID, question: "P?", answer: "",
    }).success).toBe(false);
  });
  test("rejeita question > 500 chars", () => {
    expect(createFaqInputSchema.safeParse({
      orgSlug: "x", agentId: AID, question: "x".repeat(501), answer: "R",
    }).success).toBe(false);
  });
});

describe("updateFaqInputSchema", () => {
  test("aceita com faqId UUID", () => {
    expect(updateFaqInputSchema.safeParse({
      orgSlug: "x", agentId: AID, faqId: UID, question: "P", answer: "R",
    }).success).toBe(true);
  });
});

describe("deleteFaqInputSchema", () => {
  test("aceita", () => {
    expect(deleteFaqInputSchema.safeParse({
      orgSlug: "x", agentId: AID, faqId: UID,
    }).success).toBe(true);
  });
});
