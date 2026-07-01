import { logError } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

type EvolutionState = "open" | "close" | "connecting" | string;

export async function handleConnectionUpdate(
  instanceName: string,
  state: EvolutionState,
): Promise<void> {
  if (!instanceName) return;
  const supabase = createServiceClient();
  let newStatus: "connected" | "error" | "pending" | "disconnected";
  let lastError: string | null = null;
  if (state === "open") {
    newStatus = "connected";
  } else if (state === "close") {
    newStatus = "error";
    lastError = "Instância desconectou no Evolution. Reconecte escaneando o QR.";
  } else if (state === "connecting") {
    newStatus = "pending";
  } else {
    newStatus = "disconnected";
  }
  const { error } = await supabase
    .from("channels")
    .update({ status: newStatus, last_error: lastError })
    .eq("type", "whatsapp_evolution")
    .eq("external_id", instanceName);
  if (error) logError("evolution.connection-update", error);
}
