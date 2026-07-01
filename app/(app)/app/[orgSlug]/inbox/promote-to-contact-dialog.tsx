"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { promoteConversationToContactAction } from "@/lib/messaging/conversations/actions";
import { ContactCombobox, type ContactOption } from "@/components/forms/contact-combobox";
import { CompanyCombobox, type CompanyOption } from "@/components/forms/company-combobox";

interface Props {
  orgSlug: string;
  conversationId: string;
  externalThreadId: string;
  defaultName?: string;
  contactOptions: ContactOption[];
  companyOptions: CompanyOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteToContactDialog({
  orgSlug,
  conversationId,
  externalThreadId,
  defaultName,
  contactOptions,
  companyOptions,
  open,
  onOpenChange,
}: Props) {
  const [mode, setMode] = useState<"link" | "create">("create");
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const input =
      mode === "link" && contactId
        ? { mode: "link" as const, orgSlug, conversationId, contactId }
        : {
            mode: "create" as const,
            orgSlug,
            conversationId,
            name,
            email: email || undefined,
            phone: externalThreadId,
            companyId: companyId ?? undefined,
          };
    const r = await promoteConversationToContactAction(input);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Contato vinculado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promover pra contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "create" ? "default" : "ghost"}
              onClick={() => setMode("create")}
            >
              Criar novo
            </Button>
            <Button
              size="sm"
              variant={mode === "link" ? "default" : "ghost"}
              onClick={() => setMode("link")}
            >
              Vincular existente
            </Button>
          </div>

          {mode === "link" ? (
            <div className="space-y-2">
              <Label>Buscar contato</Label>
              <ContactCombobox
                options={contactOptions}
                value={contactId}
                onChange={setContactId}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="promote-name">Nome *</Label>
                <Input
                  id="promote-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promote-email">Email</Label>
                <Input
                  id="promote-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={externalThreadId} disabled />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <CompanyCombobox
                  options={companyOptions}
                  value={companyId}
                  onChange={setCompanyId}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={busy || (mode === "link" ? !contactId : name.length === 0)}
          >
            {busy && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
