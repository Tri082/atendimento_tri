"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface TriggerLite {
  id: string;
  label: string;
  description: string;
}

export function TriggerSection({
  triggers,
  value,
  onChange,
}: {
  triggers: TriggerLite[];
  value: { triggerType: string; triggerConfig: Record<string, unknown> };
  onChange: (v: {
    triggerType: string;
    triggerConfig: Record<string, unknown>;
  }) => void;
}) {
  const description = triggers.find((t) => t.id === value.triggerType)
    ?.description;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quando</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="trigger-type">Evento que dispara</Label>
          <select
            id="trigger-type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value.triggerType}
            onChange={(e) =>
              onChange({ triggerType: e.target.value, triggerConfig: {} })
            }
          >
            {triggers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {(value.triggerType === "conversation.created" ||
          value.triggerType === "message.received") && (
          <ChannelTypeFilter
            value={
              (value.triggerConfig.channel_type_in as string[] | undefined) ??
              []
            }
            onChange={(arr) =>
              onChange({
                triggerType: value.triggerType,
                triggerConfig: {
                  ...value.triggerConfig,
                  channel_type_in: arr,
                },
              })
            }
          />
        )}
        {value.triggerType === "deal.stage_changed" && (
          <>
            <StageFilter
              label="Só quando entra em (opcional)"
              value={
                (value.triggerConfig.only_new_stage as string | undefined) ??
                ""
              }
              onChange={(v) =>
                onChange({
                  triggerType: value.triggerType,
                  triggerConfig: {
                    ...value.triggerConfig,
                    only_new_stage: v || undefined,
                  },
                })
              }
            />
            <StageFilter
              label="Só quando sai de (opcional)"
              value={
                (value.triggerConfig.only_from_stage as string | undefined) ??
                ""
              }
              onChange={(v) =>
                onChange({
                  triggerType: value.triggerType,
                  triggerConfig: {
                    ...value.triggerConfig,
                    only_from_stage: v || undefined,
                  },
                })
              }
            />
          </>
        )}
        {value.triggerType === "deal.created" && (
          <StageFilter
            label="Só no estágio (opcional)"
            value={
              (value.triggerConfig.only_stage as string | undefined) ?? ""
            }
            onChange={(v) =>
              onChange({
                triggerType: value.triggerType,
                triggerConfig: {
                  ...value.triggerConfig,
                  only_stage: v || undefined,
                },
              })
            }
          />
        )}
        {value.triggerType === "contact.created" && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="only-with-email"
              checked={value.triggerConfig.only_with_email === true}
              onChange={(e) =>
                onChange({
                  triggerType: value.triggerType,
                  triggerConfig: {
                    ...value.triggerConfig,
                    only_with_email: e.target.checked,
                  },
                })
              }
            />
            <Label htmlFor="only-with-email" className="text-sm cursor-pointer">
              Só quando o contato tem email
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChannelTypeFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const options = ["whatsapp_cloud", "whatsapp_evolution", "mock"];
  return (
    <div>
      <Label>Só nestes canais (vazio = todos)</Label>
      <div className="flex flex-wrap gap-3 mt-1">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-center gap-1 text-xs cursor-pointer"
          >
            <input
              type="checkbox"
              checked={value.includes(o)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, o]
                    : value.filter((v) => v !== o),
                )
              }
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function StageFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const stages = [
    "",
    "new",
    "qualified",
    "proposal_sent",
    "negotiation",
    "won",
    "lost",
  ];
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {stages.map((s) => (
          <option key={s || "any"} value={s}>
            {s || "(qualquer)"}
          </option>
        ))}
      </select>
    </div>
  );
}
