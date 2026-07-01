"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CompanyCombobox, type CompanyOption } from "@/components/forms/company-combobox";
import { TextField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDealAction } from "@/lib/deals/actions";
import { type CreateDealInput, createDealSchema } from "@/lib/deals/schemas";

type Props = {
  orgSlug: string;
  companies: CompanyOption[];
  defaultCompanyId?: string;
};

export function NewDealDialog({ orgSlug, companies, defaultCompanyId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateDealInput>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      orgSlug,
      companyId: defaultCompanyId ?? "",
      name: "",
      value: null,
      expectedCloseDate: null,
    },
  });

  function onSubmit(values: CreateDealInput) {
    startTransition(async () => {
      const r = await createDealAction(values);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Deal criado");
      form.reset({
        orgSlug,
        companyId: defaultCompanyId ?? "",
        name: "",
        value: null,
        expectedCloseDate: null,
      });
      setOpen(false);
      if (r.data?.id) {
        router.push(`/app/${orgSlug}/deals/${r.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            Novo deal
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo deal</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              name="name"
              control={form.control}
              label="Nome do deal"
              inputProps={{ placeholder: "Ex: Reestruturação financeira 2026" }}
            />
            <div className="space-y-1.5">
              <label className="font-medium text-sm">Empresa *</label>
              <Controller
                name="companyId"
                control={form.control}
                render={({ field }) => (
                  <CompanyCombobox
                    options={companies}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                    placeholder="Selecionar empresa..."
                    allowClear={false}
                  />
                )}
              />
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
                    placeholder="50000"
                  />
                  <p className="text-muted-foreground text-xs">Opcional</p>
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
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando..." : "Criar deal"}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
