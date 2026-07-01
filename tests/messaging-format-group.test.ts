import { describe, expect, test } from "vitest";
import { groupMessagesByDay, groupMessagesBySender } from "@/lib/messaging/format/group";

function localDate(year: number, month: number, day: number, hours = 0, minutes = 0): Date {
  return new Date(year, month - 1, day, hours, minutes, 0);
}

const msg = (id: string, day: string, sender: string) => ({
  id,
  created_at: localDate(2026, 6, parseInt(day), 10, 0).toISOString(),
  sender_kind: sender as never,
  sender_user_id: sender === "user" ? "u1" : null,
});

describe("groupMessagesByDay", () => {
  test("agrupa por data", () => {
    const result = groupMessagesByDay([
      msg("a", "1", "user"),
      msg("b", "1", "contact"),
      msg("c", "2", "user"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.messages).toHaveLength(2);
    expect(result[1]?.messages).toHaveLength(1);
  });
  test("vazio retorna []", () => {
    expect(groupMessagesByDay([])).toEqual([]);
  });
});

describe("groupMessagesBySender", () => {
  test("agrupa mensagens consecutivas do mesmo sender", () => {
    const result = groupMessagesBySender([
      msg("a", "1", "contact"),
      msg("b", "1", "contact"),
      msg("c", "1", "user"),
      msg("d", "1", "contact"),
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]?.messages).toHaveLength(2);
    expect(result[1]?.messages).toHaveLength(1);
    expect(result[2]?.messages).toHaveLength(1);
  });
});
