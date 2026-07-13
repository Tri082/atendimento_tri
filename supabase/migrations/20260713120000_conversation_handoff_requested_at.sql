-- Timestamp de quando a conversa passou a aguardar um atendente humano (IA
-- escalou via escalate_to_human, ou o roteiro de onboarding terminou/travou).
-- Null quando ninguém está esperando.
--
-- Diferente de agent_status='paused_handoff', que também cobre o caso de um
-- atendente já ter assumido manualmente (clique em "Assumir") — nesse caso
-- handoff_requested_at NÃO é setado, então essa conversa não entra no
-- destaque visual de "aguardando" (o atendente já sabe do caso).
alter table conversations
  add column handoff_requested_at timestamptz;

comment on column conversations.handoff_requested_at is
  'Quando a conversa passou a aguardar humano (escalação da IA ou fim do onboarding). Null = ninguém aguardando. Ver lib/messaging/CLAUDE.md.';
