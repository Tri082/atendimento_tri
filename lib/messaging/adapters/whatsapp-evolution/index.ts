import { registerAdapter } from "@/lib/messaging/registry";
import { evolutionAdapter } from "./adapter";

registerAdapter(evolutionAdapter);

export { evolutionAdapter };
