# CLAUDE.md — lib/orgs

CRUD de organizações (workspace/tenant). Diferente dos outros domínios porque é a raiz da multi-tenancy — não tem `organization_id` (ele É a org).

Arquivos:
- `schemas.ts` — Zod (nome, slug)
- `queries.ts` — `getOrgBySlug`, `getMyOrgs` (filtra por `memberships.user_id = auth.uid()`)
- `actions.ts` — criar org, atualizar nome/slug/logo. Criação usa RPC `create_organization_with_owner` (atomic: insere org + membership owner)
- `slug.ts` — geração/validação de slug
- `storage.ts` — upload de `logo_url` no bucket org-logos

Regra crítica: **NÃO** rode queries em `organizations` sem passar pelos guards (`requireOrgMember`/`requireOrgRole`) — RLS bloqueia, mas defensivo é melhor.
