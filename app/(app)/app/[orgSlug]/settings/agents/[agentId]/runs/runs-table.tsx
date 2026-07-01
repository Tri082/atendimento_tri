"use client";

import { Badge } from "@/components/ui/badge";

type Run = {
  id: string;
  conversation_id: string;
  status: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  tools_called: unknown;
  started_at: string;
  finished_at: string | null;
};

export function RunsTable({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma execução ainda.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs">
          <tr>
            <th className="p-2 text-left">Quando</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Tokens</th>
            <th className="p-2 text-left">Tools</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{new Date(r.started_at).toLocaleString("pt-BR")}</td>
              <td className="p-2">
                <Badge variant={r.status === "succeeded" ? "default" : "destructive"}>{r.status}</Badge>
              </td>
              <td className="p-2">
                {(r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0)}
              </td>
              <td className="p-2 text-muted-foreground text-xs">
                {Array.isArray(r.tools_called)
                  ? (r.tools_called as Array<{ name: string }>).map((t) => t.name).join(", ")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
