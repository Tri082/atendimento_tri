import { describe, expect, test } from "vitest";
import { normalizePhone, phoneMatches } from "@/lib/messaging/normalize";

describe("normalizePhone", () => {
  test("número BR com 11 dígitos (celular) ganha +55", () => {
    expect(normalizePhone("11987654321")).toBe("+5511987654321");
  });

  test("número BR já com +55", () => {
    expect(normalizePhone("+5511987654321")).toBe("+5511987654321");
  });

  test("número BR com formatação (parênteses, hífen, espaço)", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("+5511987654321");
  });

  test("número BR sem 9 inicial (fixo, 10 dígitos)", () => {
    expect(normalizePhone("1132212222")).toBe("+551132212222");
  });

  test("número internacional com +", () => {
    expect(normalizePhone("+14155552671")).toBe("+14155552671");
  });

  test("número muito curto retorna null", () => {
    expect(normalizePhone("123")).toBeNull();
  });

  test("string vazia retorna null", () => {
    expect(normalizePhone("")).toBeNull();
  });

  test("null/undefined retorna null", () => {
    expect(normalizePhone(null as unknown as string)).toBeNull();
    expect(normalizePhone(undefined as unknown as string)).toBeNull();
  });
});

describe("phoneMatches", () => {
  test("dois formatos diferentes do mesmo número casam", () => {
    expect(phoneMatches("11987654321", "+55 11 98765-4321")).toBe(true);
  });

  test("números diferentes não casam", () => {
    expect(phoneMatches("11987654321", "11987654322")).toBe(false);
  });

  test("null em qualquer lado é false", () => {
    expect(phoneMatches(null, "11987654321")).toBe(false);
    expect(phoneMatches("11987654321", null)).toBe(false);
  });
});
