"use client";

import { useRef, useState } from "react";
import { Loader2Icon, PaperclipIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadConversationMediaAction } from "@/lib/messaging/conversations/actions";

export interface UploadedMedia {
  path: string;
  signedUrl: string;
  mimeType: string;
  filename: string;
}

interface Props {
  orgSlug: string;
  conversationId: string;
  attached: UploadedMedia | null;
  onChange: (m: UploadedMedia | null) => void;
}

export function AttachmentUploader({ orgSlug, conversationId, attached, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande (max 100MB).");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      const r = await uploadConversationMediaAction({
        orgSlug,
        conversationId,
        fileBase64: base64,
        mimeType: file.type || "application/octet-stream",
        filename: file.name,
      });
      setUploading(false);
      if (e.target) e.target.value = "";
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onChange({ ...r.data!, filename: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  if (attached) {
    return (
      <div className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1 text-xs">
        <span className="truncate max-w-[160px]">{attached.filename}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="remover">
          <XIcon className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handle}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Anexar"
      >
        {uploading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PaperclipIcon className="h-4 w-4" />}
      </Button>
    </>
  );
}
