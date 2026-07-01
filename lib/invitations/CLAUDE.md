# CLAUDE.md — lib/invitations

Convites pra novos membros da org. Owner/admin cria convite → email com token → destinatário aceita via RPC `accept_invitation`.

- `schemas.ts` — Zod (email, role, token)
- `actions.ts` — `createInvitationAction` (admin), `acceptInvitationAction` (qualquer logado)

Tokens são UUID v4, válidos por 7 dias (default da migration). `accept_invitation` é SECURITY DEFINER — bypassa RLS pra inserir o membership atomicamente.

Email é enviado via `lib/email/` (provider abstrato). Veja `lib/email/CLAUDE.md`.
