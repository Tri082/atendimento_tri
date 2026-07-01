"use client";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Condition {
  field: string;
  op: string;
  value?: unknown;
}

const OPS: { id: string; label: string }[] = [
  { id: "eq", label: "igual a" },
  { id: "ne", label: "diferente de" },
  { id: "gt", label: "maior que" },
  { id: "gte", label: "maior ou igual a" },
  { id: "lt", label: "menor que" },
  { id: "lte", label: "menor ou igual a" },
  { id: "contains", label: "contém" },
  { id: "not_contains", label: "não contém" },
  { id: "in", label: "está em" },
  { id: "not_in", label: "não está em" },
  { id: "is_empty", label: "é vazio" },
  { id: "is_not_empty", label: "não é vazio" },
];

const NO_VALUE_OPS = new Set(["is_empty", "is_not_empty"]);

export function ConditionsSection({
  value,
  onChange,
}: {
  value: Condition[];
  onChange: (v: Condition[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Se (todas precisam passar)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {value.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Sem condições. Toda execução do trigger vai disparar as ações.
          </p>
        )}
        {value.map((c, idx) => (
          <div
            key={`cond-${idx}-${c.field}`}
            className="flex flex-wrap items-center gap-2"
          >
            <Input
              className="max-w-[200px]"
              placeholder="campo (ex: contact.email)"
              value={c.field}
              onChange={(e) => {
                const next = [...value];
                next[idx] = { ...c, field: e.target.value };
                onChange(next);
              }}
            />
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={c.op}
              onChange={(e) => {
                const next = [...value];
                next[idx] = { ...c, op: e.target.value };
                if (NO_VALUE_OPS.has(e.target.value)) {
                  delete next[idx].value;
                }
                onChange(next);
              }}
            >
              {OPS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {!NO_VALUE_OPS.has(c.op) &&
              (c.op === "in" || c.op === "not_in" ? (
                /* Sub-H M-4: textarea com "um valor por linha" — evita JSON.parse parcial salvando string */
                <Textarea
                  className="max-w-[200px] min-h-[60px]"
                  placeholder="um valor por linha"
                  value={Array.isArray(c.value) ? c.value.join("\n") : ""}
                  onChange={(e) => {
                    const next = [...value];
                    const arr = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    next[idx] = { ...c, value: arr };
                    onChange(next);
                  }}
                />
              ) : (
                <Input
                  className="max-w-[200px]"
                  placeholder="valor"
                  value={
                    typeof c.value === "string" || typeof c.value === "number"
                      ? String(c.value)
                      : c.value !== undefined
                        ? JSON.stringify(c.value)
                        : ""
                  }
                  onChange={(e) => {
                    const next = [...value];
                    next[idx] = { ...c, value: e.target.value };
                    onChange(next);
                  }}
                />
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              aria-label="Remover condição"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {value.length < 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([...value, { field: "", op: "eq", value: "" }])
            }
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Adicionar condição
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
