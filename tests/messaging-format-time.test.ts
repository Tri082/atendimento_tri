import { describe, expect, test } from "vitest";
import { formatMessageTime, formatDay } from "@/lib/messaging/format/time";

// Use local midnight to ensure consistent timezone behavior
function localDate(year: number, month: number, day: number, hours = 0, minutes = 0): Date {
  return new Date(year, month - 1, day, hours, minutes, 0);
}

const NOW = localDate(2026, 6, 2, 15, 30);

describe("formatMessageTime", () => {
  test("hoje → HH:mm", () => {
    expect(formatMessageTime(localDate(2026, 6, 2, 10, 42), NOW)).toBe("10:42");
  });
  test("ontem → 'ontem'", () => {
    expect(formatMessageTime(localDate(2026, 6, 1, 10, 42), NOW)).toBe("ontem");
  });
  test("essa semana → dia abreviado", () => {
    expect(formatMessageTime(localDate(2026, 5, 28, 10, 42), NOW)).toMatch(/^(seg|ter|qua|qui|sex|sáb|dom)$/i);
  });
  test("mais antigo → dd/MM", () => {
    expect(formatMessageTime(localDate(2026, 4, 15, 10, 42), NOW)).toBe("15/04");
  });
  test("null → ''", () => {
    expect(formatMessageTime(null, NOW)).toBe("");
  });
});

describe("formatDay", () => {
  test("hoje → 'hoje'", () => {
    expect(formatDay(localDate(2026, 6, 2, 8, 0), NOW)).toBe("hoje");
  });
  test("ontem → 'ontem'", () => {
    expect(formatDay(localDate(2026, 6, 1, 8, 0), NOW)).toBe("ontem");
  });
  test("mais antigo → dd/MM/yyyy", () => {
    expect(formatDay(localDate(2026, 4, 15, 8, 0), NOW)).toBe("15/04/2026");
  });
});
