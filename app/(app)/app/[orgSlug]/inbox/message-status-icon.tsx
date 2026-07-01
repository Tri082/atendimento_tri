import { CheckIcon, CheckCheckIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageStatusIcon({ status }: { status: string }) {
  const base = "h-3 w-3 inline-block";
  switch (status) {
    case "queued":
    case "sending":
      return <ClockIcon className={cn(base, "text-muted-foreground")} aria-label="enviando" />;
    case "sent":
      return <CheckIcon className={cn(base, "text-muted-foreground")} aria-label="enviada" />;
    case "delivered":
      return <CheckCheckIcon className={cn(base, "text-muted-foreground")} aria-label="entregue" />;
    case "read":
      return <CheckCheckIcon className={cn(base, "text-primary")} aria-label="lida" />;
    case "failed":
      return <XCircleIcon className={cn(base, "text-destructive")} aria-label="falhou" />;
    default:
      return null;
  }
}
