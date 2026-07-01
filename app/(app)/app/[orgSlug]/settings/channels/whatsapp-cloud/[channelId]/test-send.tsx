"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { testSendTemplateAction } from "@/lib/messaging/adapters/whatsapp-cloud/actions";

interface Template {
  id: string;
  name: string;
  language: string;
  param_count: number;
}

export function TestSendForm({
  orgSlug,
  channelId,
  templates,
}: {
  orgSlug: string;
  channelId: string;
  templates: Template[];
}) {
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [params, setParams] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selected = templates.find((t) => t.id === selectedId);

  async function onSend() {
    if (!selected) return;
    setSubmitting(true);
    const r = await testSendTemplateAction({
      orgSlug,
      channelId,
      to,
      templateName: selected.name,
      language: selected.language,
      params,
    });
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Template disparado. Veja na inbox em alguns segundos.");
    setTo("");
    setParams({});
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 bg-card/40 py-3">
        <CardTitle className="label-mono text-[10px]">/ enviar template de teste</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum template aprovado disponível. Sincronize primeiro.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="test-to">Telefone (com DDD, ex: 11987654321)</Label>
              <Input
                id="test-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="11987654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-tpl">Template</Label>
              <select
                id="test-tpl"
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
                    onChange={(e) =>
                      setParams({ ...params, [`p${i + 1}`]: e.target.value })
                    }
                  />
                ))}
              </div>
            )}
            <Button onClick={onSend} disabled={submitting || !to || !selected}>
              {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              <SendIcon className="mr-2 h-4 w-4" />
              Enviar teste
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
