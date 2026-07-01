-- conversations: armazena o nome que o provider externo manda (pushName WhatsApp,
-- first_name Telegram, etc.) — usado pra display até o contato ser cadastrado.
alter table public.conversations
  add column if not exists display_name text;

-- Realtime: por default a publication identifica as linhas em UPDATE só pela PK,
-- então o evento de UPDATE não carrega `organization_id`. Resultado: subscribers
-- com filter `organization_id=eq.X` perdem todo UPDATE (last_message_at, unread_count).
-- `replica identity full` faz o WAL gravar a linha inteira em cada UPDATE.
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.conversation_tag_links replica identity full;
