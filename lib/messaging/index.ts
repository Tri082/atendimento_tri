/**
 * Barrel da camada de mensageria.
 *
 * Importar este módulo (`import "@/lib/messaging"`) garante que TODOS os
 * adapters estão registrados no registry. Imports estão por side-effect:
 * cada arquivo de adapter chama `registerAdapter(...)` no top-level.
 *
 * Pra adicionar um adapter novo: criar arquivo em ./adapters/, adicionar
 * uma linha de import aqui. Sem mais nada.
 */

import "./adapters/mock";
import "./adapters/whatsapp-cloud";
import "./adapters/whatsapp-evolution";
import "./adapters/telegram";
import "./adapters/instagram-dm";
import "./adapters/sms";

export type { ChannelType, MessagingAdapter, NormalizedEvent } from "./adapter";
export { getAdapter, hasAdapter, registerAdapter } from "./registry";
