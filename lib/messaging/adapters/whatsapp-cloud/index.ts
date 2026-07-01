import { registerAdapter } from "@/lib/messaging/registry";
import { whatsappCloudAdapter } from "./adapter";

registerAdapter(whatsappCloudAdapter);

export { whatsappCloudAdapter };
