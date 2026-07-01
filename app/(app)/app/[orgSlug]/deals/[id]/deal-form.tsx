"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CompanyCombobox, type CompanyOption } from "@/components/forms/company-combobox";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { deleteDealAction, moveDealStageAction, updateDealAction } from "@/lib/deals/actions";
import { type DealStage, STAGE_LABELS, STAGE_ORDER } from "@/lib/deals/stages";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200),
  value: z.number().nonnegative().nullable(),
  expectedCloseDate: z.string().nullable(),
  lostReason: z.string().max(1000).nullable(),
  companyId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  orgSlug: string;
  canDelete: boolean;
  companies: CompanyOption[];
  deal: {
    id: string;
    name: string;
    stage: DealStage;
    value: number | null;
    expectedCloseDate: string | null;
    lostReason: string | null;
    companyId: string;
  };
};

export function DealForm({ orgSlug, canDelete, companies, deal }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [movingStage, startMoveStage] = useTransition();
  const [deleting, startDelete] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: deal.name,
      value: deal.value,
      expectedCloseDate: deal.expectedCloseDate,
      lostReason: deal.lostReason,
      companyId: deal.companyId,
    },
  });

  const currentStage = deal.stage;

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const r = await updateDealAction({
        orgSlug,
        id: deal.id,
        name: values.name,
        value: values.value,
        expectedCloseDate: values.expectedCloseDate,
        lostReason: currentStage === "lost" ? values.lostReason : null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Deal atualizado");
    });
  }

  function handleStageChange(next: DealStage) {
    startMoveStage(async () => {
      const r = await moveDealStageAction({ orgSlug, id: deal.id, stage: next });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Stage atualizado");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Apagar esse deal? Essa ação não pode ser desfeita.")) return;
    startDelete(async () => {
      const r = await deleteDealAction({ orgSlug, id: deal.id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Deal apagado");
      router.push(`/app/${orgSlug}/deals`);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextField name="name" control={form.control} label="Nome" />

        <div className="space-y-1.5">
          <label className="font-medium text-sm">Empresa</label>
          <Controller
            name="companyId"
            control={form.control}
            render={({ field }) => (
              <CompanyCombobox
                options={companies}
                value={field.value || null}
                onChange={(v) => v && field.onChange(v)}
                allowClear={false}
              />
            )}
          />
          <p className="text-muted-foreground text-xs">
            Mudar empresa requer deletar e recriar o deal (deals em B2B pertencem a uma empresa só).
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-sm">Stage</label>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-input p-1 md:grid-cols-3">
            {STAGE_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                disabled={movingStage}
                onClick={() => handleStageChange(s)}
                className={`rounded-sm px-2 py-1 text-xs transition-colors ${
                  s === currentStage
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <Controller
          name="value"
          control={form.control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <label htmlFor="deal-value" className="font-medium text-sm">
                Valor (R$)
              </label>
              <input
                id="deal-value"
                type="number"
                step="0.01"
                min="0"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              />
            </div>
          )}
        />

        <TextField
          name="expectedCloseDate"
          control={form.control}
          label="Data esperada de fechamento"
          description="Opcional"
          inputProps={{ type: "date" }}
        />

        {currentStage === "lost" && (
          <TextField
            name="lostReason"
            control={form.control}
            label="Motivo da perda"
            description="O que aprendemos com esse deal?"
          />
        )}

        <div className="flex items-center justify-between pt-2">
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              {deleting ? "Apagando..." : "Apagar"}
            </Button>
          ) : (
            <div />
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
