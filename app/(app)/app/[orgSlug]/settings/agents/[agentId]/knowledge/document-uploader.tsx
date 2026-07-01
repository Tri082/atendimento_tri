"use client";

import { useRef, useTransition } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadDocumentAction } from "@/lib/agent/documents/actions";

const MAX_BYTES = 20 * 1024 * 1024;

export function DocumentUploader({ orgSlug, agentId }: { orgSlug: string; agentId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Só PDF é aceito.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 20MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      startTransition(async () => {
        const r = await uploadDocumentAction({
          orgSlug,
          agentId,
          filename: file.name,
          fileBase64: base64,
          mimeType: file.type,
        });
        if (e.target) e.target.value = "";
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success("Documento subido — processando…");
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handle}
      />
      <Button size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
        {pending ? (
          <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <UploadIcon className="mr-1 h-3.5 w-3.5" />
        )}
        Subir PDF
      </Button>
    </>
  );
}
