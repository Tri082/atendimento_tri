"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, RefreshCwIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { deleteDocumentAction, reprocessDocumentAction } from "@/lib/agent/documents/actions";

interface Doc {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  ready_at: string | null;
}

interface Props {
  orgSlug: string;
  agentId: string;
  documents: Doc[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700">
        <CheckIcon className="h-3 w-3" /> pronto
      </span>
    );
  }
  if (status === "processing" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700">
        <Loader2Icon className="h-3 w-3 animate-spin" /> processando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive" title={error ?? undefined}>
      <XIcon className="h-3 w-3" /> falhou
    </span>
  );
}

const COOLDOWN_MS = 60_000;

function ReprocessButton({
  orgSlug,
  agentId,
  documentId,
  chunkCount,
  status,
  readyAt,
  createdAt,
}: {
  orgSlug: string;
  agentId: string;
  documentId: string;
  chunkCount: number;
  status: string;
  readyAt: string | null;
  createdAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (status === "processing" || status === "pending") return null;

  const lastActionAt = new Date(readyAt ?? createdAt).getTime();
  const cooldownActive = Date.now() - lastActionAt < COOLDOWN_MS;
  const label = status === "failed" ? "Tentar novamente" : "Reprocessar";

  function onConfirm() {
    start(async () => {
      const r = await reprocessDocumentAction({ orgSlug, agentId, documentId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Reprocessando…");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={cooldownActive}
            title={cooldownActive ? "Aguarde um pouco antes de reprocessar de novo." : undefined}
          >
            <RefreshCwIcon className="mr-1 h-3.5 w-3.5" />
            {label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprocessar documento?</DialogTitle>
          <DialogDescription>
            Vai apagar os {chunkCount} trecho{chunkCount === 1 ? "" : "s"} atual{chunkCount === 1 ? "" : "is"} e re-processar o PDF do zero.
            Custa ~R$ 0,01 em OpenAI e leva ~30 segundos. Os trechos antigos vão sumir e novos vão aparecer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Reprocessando…" : "Reprocessar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentList({ orgSlug, agentId, documents }: Props) {
  const [docs, setDocs] = useState(documents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`agent-docs-${agentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_documents", filter: `agent_id=eq.${agentId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setDocs((prev) =>
              prev.map((d) => (d.id === (payload.new as Doc).id ? { ...d, ...(payload.new as Doc) } : d)),
            );
          } else if (payload.eventType === "INSERT") {
            setDocs((prev) => [payload.new as Doc, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setDocs((prev) => prev.filter((d) => d.id !== (payload.old as { id: string }).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  async function handleDelete(id: string) {
    const r = await deleteDocumentAction({ orgSlug, agentId, documentId: id });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Documento removido");
  }

  if (docs.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Nenhum documento ainda. Suba um PDF (catálogo, manual, etc.) pra o agente consultar.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-sm">{d.filename}</span>
              <StatusBadge status={d.status} error={d.error_message} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatSize(d.size_bytes)}
              {d.status === "ready" && <> · {d.chunk_count} chunks</>}
              {d.error_message && (
                <> · <span className="text-destructive">{d.error_message}</span></>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ReprocessButton
              orgSlug={orgSlug}
              agentId={agentId}
              documentId={d.id}
              chunkCount={d.chunk_count}
              status={d.status}
              readyAt={d.ready_at}
              createdAt={d.created_at}
            />
            <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}>
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
