"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CompanyOption = {
  id: string;
  name: string;
};

type Props = {
  options: CompanyOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  allowClear?: boolean;
};

export function CompanyCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Selecionar empresa...",
  allowClear = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected ? selected.name : placeholder}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {allowClear && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  Limpar seleção
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn("mr-2 h-3.5 w-3.5", value === o.id ? "opacity-100" : "opacity-0")}
                  />
                  {o.name}
                </CommandItem>
              ))}
              {onCreateNew && (
                <CommandItem
                  value="__create_new__"
                  onSelect={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="border-border/60 border-t"
                >
                  <PlusIcon className="mr-2 h-3.5 w-3.5" />
                  Cadastrar nova empresa
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
