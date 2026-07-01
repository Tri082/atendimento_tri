"use client";

import { DownloadIcon, FileIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteCompanyDocumentAction,
  getCompanyDocumentUrlAction,
  uploadCompanyDocumentAction,
} from "@/lib/companies/documents";
import type { CompanyDocument } from "@/lib/companies/queries";

type Props = {
  orgSlug: string;
  companyId: string;
  initial: CompanyDocument[];
};

function displayName(storedName: string): string {
  const idx = storedName.indexOf("_");
  return idx > 0 ? storedName.slice(idx + 1) : storedName;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompanyDocuments({ orgSlug, companyId, initial }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState(initial);
  const [uploading, startUpload] = useTransition();
  const [busyPath, setBusyPath] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const formData = new FormData();
    formData.set("orgSlug", orgSlug);
    formData.set("companyId", companyId);
    formData.set("file", file);

    startUpload(async () => {
      const r = await uploadCompanyDocumentAction(formData);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data) {
        setDocs((current) => [
          {
            name: r.data!.path.split("/").pop() ?? r.data!.name,
            path: r.data!.path,
            size: r.data!.size,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        toast.success("Arquivo enviado");
      }
    });
  }

  async function handleDownload(path: string) {
    setBusyPath(path);
    const r = await getCompanyDocumentUrlAction({ orgSlug, path });
    setBusyPath(null);
    if (!r.ok || !r.data) {
      toast.error(r.ok ? "Não consegui gerar o link" : r.error);
      return;
    }
    window.open(r.data.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(path: string) {
    if (!confirm("Apagar esse arquivo? Essa ação não pode ser desfeita.")) return;
    setBusyPath(path);
    const r = await deleteCompanyDocumentAction({ orgSlug, path });
    setBusyPath(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setDocs((current) => current.filter((d) => d.path !== path));
    toast.success("Arquivo apagado");
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="hidden"
      />

      {docs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum arquivo anexado ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li
              key={doc.path}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{displayName(doc.name)}</p>
                  <p className="text-muted-foreground text-xs">{humanSize(doc.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(doc.path)}
                  disabled={busyPath === doc.path}
                  aria-label="Baixar"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(doc.path)}
                  disabled={busyPath === doc.path}
                  aria-label="Apagar"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={pickFile}
        disabled={uploading}
        className="gap-1.5"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        {uploading ? "Enviando..." : "Anexar arquivo"}
      </Button>
      <p className="text-muted-foreground text-xs">PDF, JPG, PNG ou WEBP. Máximo 10 MB.</p>
    </div>
  );
}
