"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CompanyOption,
  getActionFields,
} from "@/lib/automations/action-fields";
import { ActionConfigForm } from "./action-config-form";
import { VariablesHelper } from "./variables-helper";

interface ActionData {
  type: string;
  config: Record<string, unknown>;
  on_error: "stop" | "continue";
}
interface ActionDefLite {
  id: string;
  label: string;
  description: string;
  category: string;
}

export function ActionConfigDialog({
  action,
  actionDef,
  triggerType,
  companies,
  onSave,
  onClose,
}: {
  action: ActionData;
  actionDef: ActionDefLite | null;
  triggerType: string;
  companies: CompanyOption[];
  onSave: (updated: Partial<ActionData>) => void;
  onClose: () => void;
}) {
  const fields = getActionFields(action.type);
  const useForm = fields !== null;

  const [config, setConfig] = useState<Record<string, unknown>>(action.config);
  const [rawText, setRawText] = useState<string>(
    JSON.stringify(action.config, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  function save() {
    if (useForm) {
      onSave({ config });
      return;
    }
    try {
      const parsed = JSON.parse(rawText);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setParseError("A configuração precisa ser um objeto JSON.");
        return;
      }
      onSave({ config: parsed as Record<string, unknown> });
    } catch {
      setParseError("JSON inválido — corrija antes de salvar.");
    }
  }

  function insertVariable(v: string) {
    const ta = document.getElementById(
      "config-textarea",
    ) as HTMLTextAreaElement | null;
    if (!ta) {
      setRawText((cur) => cur + v);
      return;
    }
    const start = ta.selectionStart ?? rawText.length;
    const end = ta.selectionEnd ?? rawText.length;
    const next = rawText.slice(0, start) + v + rawText.slice(end);
    setRawText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + v.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">
            {actionDef?.label ?? action.type}
          </h2>
          {actionDef?.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {actionDef.description}
            </p>
          )}
        </div>
        <div className="p-4 space-y-4">
          {useForm ? (
            <ActionConfigForm
              fields={fields!}
              value={config}
              triggerType={triggerType}
              companies={companies}
              onChange={setConfig}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="config-textarea">Configuração (JSON)</Label>
                <VariablesHelper triggerType={triggerType} onInsert={insertVariable} />
              </div>
              <Textarea
                id="config-textarea"
                rows={10}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setParseError(null);
                }}
                className="font-mono text-xs"
              />
              {parseError && (
                <p className="mt-1 text-xs text-destructive">{parseError}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Esta ação ainda não tem form simplificado. Edite o JSON direto.
              </p>
            </div>
          )}

          <div>
            <Label>Se essa ação falhar:</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button
                size="sm"
                variant={action.on_error === "stop" ? "default" : "outline"}
                onClick={() =>
                  onSave({ on_error: "stop", config: useForm ? config : parseConfigSafe(rawText, config) })
                }
              >
                Para a automação
              </Button>
              <Button
                size="sm"
                variant={action.on_error === "continue" ? "default" : "outline"}
                onClick={() =>
                  onSave({
                    on_error: "continue",
                    config: useForm ? config : parseConfigSafe(rawText, config),
                  })
                }
              >
                Segue pra próxima
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function parseConfigSafe(
  raw: string,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
