"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadOrgLogoAction } from "@/lib/orgs/actions";

type Props = {
  orgSlug: string;
  orgName: string;
  currentLogoUrl: string | null;
};

export function LogoUploader({ orgSlug, orgName, currentLogoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);

    startTransition(async () => {
      const result = await uploadOrgLogoAction(orgSlug, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // NEW-HIGH-8: server retorna path (não URL pública). Mostrar preview
      // local enquanto o servidor revalida o layout pra trazer signed URL.
      toast.success("Logo atualizado");
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setPreview(reader.result);
      };
      const file = inputRef.current?.files?.[0];
      if (file) reader.readAsDataURL(file);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 rounded-lg">
        <AvatarImage src={preview ?? undefined} alt={orgName} />
        <AvatarFallback className="rounded-lg bg-primary/20 text-2xl text-primary">
          {orgName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Enviando..." : "Trocar logo"}
        </Button>
        <p className="text-muted-foreground text-xs">PNG, JPG, WebP ou GIF. Máx 2MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
