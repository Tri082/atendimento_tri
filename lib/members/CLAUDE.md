# CLAUDE.md — lib/members

Gestão de membros da org (mudar role, remover, transferir ownership).

- `schemas.ts` — Zod (userId, role)
- `actions.ts` — `updateMemberRoleAction`, `removeMemberAction`, `transferOwnershipAction`

Transferência de ownership usa RPC `transfer_ownership` (atomic: rebaixa owner atual a admin + promove o novo) — não dá pra fazer em 2 updates separados sem corromper o estado.

Owner é sempre **exatamente 1** por org. Toda action aqui valida esse invariante via `requireOrgRole(["owner"])` ou checks dentro do RPC.
