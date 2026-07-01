-- Sub-G: adiciona "whatsapp_evolution" ao CHECK do channels.type.
-- Coexiste com whatsapp_cloud — org pode ter os dois conectados.

alter table public.channels
  drop constraint if exists channels_type_check;

alter table public.channels
  add constraint channels_type_check
  check (type in ('whatsapp_cloud', 'whatsapp_evolution', 'telegram', 'instagram_dm', 'sms', 'mock'));
