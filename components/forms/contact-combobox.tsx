"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
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

export type ContactOption = {
  id: string;
  name: string;
  companyId: string | null;
  companyName: string | null;
};

type Props = {
  options: ContactOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  onCreateNew?: () => void;
  prioritizeCompanyId?: string | null;
  placeholder?: string;
  excludeIds?: string[];
};

export function ContactCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  prioritizeCompanyId,
  placeholder = "Selecionar contato...",
  excludeIds = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const visible = useMemo(() => {
    const filtered = options.filter((o) => !excludeIds.includes(o.id));
    if (!prioritizeCompanyId) return filtered;
    return [...filtered].sort((a, b) => {
      const aMatch = a.companyId === prioritizeCompanyId ? 0 : 1;
      const bMatch = b.companyId === prioritizeCompanyId ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name);
    });
  }, [options, prioritizeCompanyId, excludeIds]);
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
          <CommandInput placeholder="Buscar contato..." />
          <CommandList>
            <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
            <CommandGroup>
              {visible.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name} ${o.companyName ?? ""}`}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn("mr-2 h-3.5 w-3.5", value === o.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span>{o.name}</span>
                    {o.companyName && (
                      <span className="text-muted-foreground text-xs">{o.companyName}</span>
                    )}
                  </div>
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
                  Cadastrar novo contato
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
