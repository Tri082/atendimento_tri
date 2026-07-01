export interface MessageLike {
  id: string;
  created_at: string;
  sender_kind: "contact" | "user" | "bot" | "system";
  sender_user_id: string | null;
}

export interface DayGroup<T extends MessageLike> {
  dayKey: string;
  date: Date;
  messages: T[];
}

export interface SenderGroup<T extends MessageLike> {
  senderKey: string;
  senderKind: T["sender_kind"];
  senderUserId: string | null;
  messages: T[];
}

export function groupMessagesByDay<T extends MessageLike>(msgs: T[]): DayGroup<T>[] {
  if (msgs.length === 0) return [];
  const groups = new Map<string, DayGroup<T>>();
  for (const m of msgs) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) {
      groups.set(key, { dayKey: key, date: d, messages: [] });
    }
    groups.get(key)?.messages.push(m);
  }
  return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function groupMessagesBySender<T extends MessageLike>(msgs: T[]): SenderGroup<T>[] {
  const result: SenderGroup<T>[] = [];
  let current: SenderGroup<T> | null = null;
  for (const m of msgs) {
    const senderKey = `${m.sender_kind}:${m.sender_user_id ?? "_"}`;
    if (!current || current.senderKey !== senderKey) {
      current = {
        senderKey,
        senderKind: m.sender_kind,
        senderUserId: m.sender_user_id,
        messages: [],
      };
      result.push(current);
    }
    current.messages.push(m);
  }
  return result;
}
