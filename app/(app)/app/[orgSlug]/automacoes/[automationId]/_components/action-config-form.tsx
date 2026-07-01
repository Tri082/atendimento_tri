// app/(app)/app/[orgSlug]/automacoes/[automationId]/_components/action-config-form.tsx
"use client";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  ActionFieldMeta,
  CompanyOption,
} from "@/lib/automations/action-fields";
import { VariableInserter } from "./variable-inserter";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

export function ActionConfigForm({
  fields,
  value,
  triggerType,
  companies,
  onChange,
}: {
  fields: ActionFieldMeta[];
  value: Record<string, unknown>;
  triggerType: string;
  companies: CompanyOption[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <FieldRow
          key={f.key}
          field={f}
          rawValue={value[f.key]}
          triggerType={triggerType}
          companies={companies}
          onChange={(v) => onChange({ ...value, [f.key]: v })}
        />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  rawValue,
  triggerType,
  companies,
  onChange,
}: {
  field: ActionFieldMeta;
  rawValue: unknown;
  triggerType: string;
  companies: CompanyOption[];
  onChange: (v: unknown) => void;
}) {
  const id = useId();
  const supportsVar = field.supportsVariables ?? false;

  function appendVariable(varPath: string) {
    const cur = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
    onChange(cur + varPath);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {supportsVar && (
          <VariableInserter triggerType={triggerType} onPick={appendVariable} />
        )}
      </div>
      {renderControl(field, id, rawValue, companies, onChange)}
      {field.hint && (
        <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>
      )}
    </div>
  );
}

function renderControl(
  field: ActionFieldMeta,
  id: string,
  rawValue: unknown,
  companies: CompanyOption[],
  onChange: (v: unknown) => void,
) {
  if (field.type === "company_select") {
    return (
      <select
        id={id}
        value={typeof rawValue === "string" ? rawValue : ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— escolha uma empresa —</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "select" || field.type === "priority") {
    const options =
      field.type === "priority" ? PRIORITY_OPTIONS : (field.options ?? []);
    return (
      <select
        id={id}
        value={typeof rawValue === "string" ? rawValue : ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— escolha —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        id={id}
        rows={4}
        value={typeof rawValue === "string" ? rawValue : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "json") {
    return (
      <JsonField
        id={id}
        value={rawValue}
        onChange={onChange}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        id={id}
        type="number"
        value={
          rawValue === null || rawValue === undefined ? "" : String(rawValue)
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(null);
          else {
            const n = Number(v);
            onChange(Number.isFinite(n) ? n : v);
          }
        }}
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <Input
      id={id}
      type={field.type === "email" ? "email" : "text"}
      value={typeof rawValue === "string" ? rawValue : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
    />
  );
}

function JsonField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState<string>(
    typeof value === "object" && value !== null
      ? JSON.stringify(value, null, 2)
      : typeof value === "string"
        ? value
        : "",
  );
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Textarea
        id={id}
        rows={6}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setError(null);
          try {
            const parsed = JSON.parse(e.target.value || "null");
            onChange(parsed);
          } catch {
            setError("JSON inválido (ainda) — termine de digitar.");
          }
        }}
        placeholder={placeholder}
        className="font-mono text-xs"
      />
      {error && <p className="mt-1 text-xs text-amber-500">{error}</p>}
    </div>
  );
}
