const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function daysBetween(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / 86400000);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatMessageTime(when: Date | string | null, now: Date = new Date()): string {
  if (!when) return "";
  const d = typeof when === "string" ? new Date(when) : when;

  if (sameDay(d, now)) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const diff = daysBetween(d, now);
  if (diff === 1) return "ontem";
  if (diff < 7) return WEEKDAYS_PT[d.getDay()] ?? "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export function formatDay(when: Date | string, now: Date = new Date()): string {
  const d = typeof when === "string" ? new Date(when) : when;
  if (sameDay(d, now)) return "hoje";
  if (daysBetween(d, now) === 1) return "ontem";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatRelative(when: Date | string, now: Date = new Date()): string {
  const d = typeof when === "string" ? new Date(when) : when;
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} h`;
  const days = Math.floor(hr / 24);
  return `há ${days} d`;
}
