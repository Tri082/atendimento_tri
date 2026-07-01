import Link from "next/link";

type Tab = "config" | "knowledge" | "runs";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "config", label: "Configuração" },
  { key: "knowledge", label: "Base de conhecimento" },
  { key: "runs", label: "Histórico" },
];

export function AgentTabs({
  orgSlug,
  agentId,
  active,
}: {
  orgSlug: string;
  agentId: string;
  active: Tab;
}) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/app/${orgSlug}/settings/agents/${agentId}?tab=${t.key}`}
          className={`border-b-2 px-3 py-2 text-sm transition-colors ${
            active === t.key
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
