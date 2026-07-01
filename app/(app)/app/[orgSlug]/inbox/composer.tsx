"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, Loader2Icon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendMessageAction } from "@/lib/messaging/actions";
import { AttachmentUploader, type UploadedMedia } from "./attachment-uploader";
import { TemplatePickerDialog } from "./template-picker-dialog";

interface Template {
  id: string;
  name: string;
  language: string;
  param_count: number;
}

interface Props {
  orgSlug: string;
  conversationId: string;
  channelId: string;
  channelType: string;
  lastInboundAt: string | null;
  templates: Template[];
}

export function Composer({
  orgSlug,
  conversationId,
  channelId,
  channelType,
  lastInboundAt,
  templates,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [attached, setAttached] = useState<UploadedMedia | null>(null);
  const [sending, setSending] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const outside24h = (() => {
    if (channelType !== "whatsapp_cloud") return false;
    if (!lastInboundAt) return true;
    return Date.now() - new Date(lastInboundAt).getTime() > 24 * 3600 * 1000;
  })();

  async function send() {
    if (!body.trim() && !attached) return;
    setSending(true);
    const r = await sendMessageAction({
      orgSlug,
      conversationId,
      body: body.trim() || undefined,
      media: attached ? [{ url: attached.signedUrl, mimeType: attached.mimeType }] : undefined,
    });
    setSending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setBody("");
    setAttached(null);
    router.refresh();
  }

  return (
    <div className="border-t border-border bg-background p-3 space-y-2">
      {outside24h && (
        <div className="rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          ⚠️ Fora da janela de 24h. Use template pra responder.
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!outside24h) send();
            }
          }}
          placeholder="Digite uma mensagem..."
          className="min-h-[40px] max-h-32 resize-none"
          disabled={outside24h}
        />
        <div className="flex items-center gap-1">
          <AttachmentUploader
            orgSlug={orgSlug}
            conversationId={conversationId}
            attached={attached}
            onChange={setAttached}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTemplateOpen(true)}
            aria-label="Template"
          >
            <FileTextIcon className="h-4 w-4" />
          </Button>
          <Button onClick={send} disabled={sending || (!body.trim() && !attached) || outside24h}>
            {sending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <TemplatePickerDialog
        orgSlug={orgSlug}
        conversationId={conversationId}
        channelId={channelId}
        templates={templates}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
    </div>
  );
}
