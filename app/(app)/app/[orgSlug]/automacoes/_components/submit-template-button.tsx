"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitTemplateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Criando..." : "Usar este modelo"}
    </Button>
  );
}
