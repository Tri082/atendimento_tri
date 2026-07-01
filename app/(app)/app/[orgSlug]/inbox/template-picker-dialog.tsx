"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendTemplateAction } from "@/lib/messaging/actions";

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
  templates: Template[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePickerDialog({ orgSlug, conversationId, templates, open, onOpenChange }: Props) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [params, setParams] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(templates[0]?.id ?? "");
      setParams({});
    }
  }, [open, templates]);

  const selected = templates.find((t) => t.id === selectedId);

  async function send() {
    if (!selected) return;
    setBusy(true);
    const r = await sendTemplateAction({
      orgSlug,
      conversationId,
      templateName: selected.name,
      language: selected.language,
      params,
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Template enviado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum template aprovado. Sincronize em /settings/channels.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Template</Label>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setParams({});
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.language}) — {t.param_count} param(s)
                    </option>
                  ))}
                </select>
              </div>
              {selected && selected.param_count > 0 && (
                <div className="space-y-2">
                  <Label>Parâmetros</Label>
                  {Array.from({ length: selected.param_count }, (_, i) => (
                    <Input
                      key={i}
                      placeholder={`{{${i + 1}}}`}
                      value={params[`p${i + 1}`] ?? ""}
                      onChange={(e) => setParams({ ...params, [`p${i + 1}`]: e.target.value })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={send} disabled={busy || !selected}>
            {busy && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
