"use client";

import { ChevronDownIcon, PlugIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectCloudDialog } from "./connect-cloud-dialog";
import { ConnectEvolutionDialog } from "./connect-evolution-dialog";

type OpenDialog = null | "cloud" | "evolution";

export function ConnectWhatsappDropdown({ orgSlug }: { orgSlug: string }) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button>
              <PlugIcon className="mr-2 h-4 w-4" />
              Conectar WhatsApp
              <ChevronDownIcon className="ml-2 h-3.5 w-3.5 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem
            onClick={() => setOpenDialog("cloud")}
            className="flex flex-col items-start gap-1 py-3"
          >
            <span className="font-medium">Oficial (Meta Cloud API)</span>
            <span className="text-xs text-muted-foreground">
              Sem risco de ban, exige aprovação Meta, custo por mensagem fora da janela.
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpenDialog("evolution")}
            className="flex flex-col items-start gap-1 py-3"
          >
            <span className="font-medium">Não-oficial (Evolution API)</span>
            <span className="text-xs text-muted-foreground">
              Grátis, sem aprovação, mas o Meta pode banir o número.
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConnectCloudDialog
        orgSlug={orgSlug}
        open={openDialog === "cloud"}
        onOpenChange={(o) => setOpenDialog(o ? "cloud" : null)}
      />
      <ConnectEvolutionDialog
        orgSlug={orgSlug}
        open={openDialog === "evolution"}
        onOpenChange={(o) => setOpenDialog(o ? "evolution" : null)}
      />
    </>
  );
}
