import type { ChannelType, MessagingAdapter } from "./adapter";

const adapters = new Map<ChannelType, MessagingAdapter>();

export function registerAdapter(adapter: MessagingAdapter): void {
  adapters.set(adapter.channel, adapter);
}

export function getAdapter(channel: ChannelType): MessagingAdapter {
  const a = adapters.get(channel);
  if (!a) throw new Error(`Adapter não registrado: ${channel}`);
  return a;
}

export function hasAdapter(channel: ChannelType): boolean {
  return adapters.has(channel);
}

/** APENAS pra testes — não usar em produção. */
export function __resetRegistry(): void {
  adapters.clear();
}
