import { describe, expect, test } from "vitest";
import { verifyBearer } from "@/lib/messaging/adapters/whatsapp-evolution/verify-webhook";

describe("verifyBearer", () => {
  const SECRET = "a".repeat(32);

  test("Bearer correto retorna true", () => {
    expect(verifyBearer(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  test("header undefined retorna false", () => {
    expect(verifyBearer(undefined, SECRET)).toBe(false);
  });

  test("header sem prefixo Bearer retorna false", () => {
    expect(verifyBearer(SECRET, SECRET)).toBe(false);
  });

  test("Bearer com prefixo errado (Basic) retorna false", () => {
    expect(verifyBearer(`Basic ${SECRET}`, SECRET)).toBe(false);
  });

  test("Bearer com secret errado retorna false", () => {
    expect(verifyBearer(`Bearer ${"b".repeat(32)}`, SECRET)).toBe(false);
  });

  test("secret vazio retorna false (defesa)", () => {
    expect(verifyBearer(`Bearer ${SECRET}`, "")).toBe(false);
  });

  test("header array — usa primeiro elemento", () => {
    expect(verifyBearer([`Bearer ${SECRET}`], SECRET)).toBe(true);
  });

  test("timing-safe (mesmo length, valor diferente)", () => {
    const fake = "b".repeat(SECRET.length);
    expect(verifyBearer(`Bearer ${fake}`, SECRET)).toBe(false);
  });
});
