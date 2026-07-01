# CLAUDE.md — lib/contacts

CRUD de contatos do CRM. Segue o **mesmo padrão de `lib/tasks/`** (queries + actions + schemas). Use aquele como modelo se for tocar aqui:

- `schemas.ts` — Zod inputs (`z.guid()` em UUIDs)
- `queries.ts` — reads escopadas por `org.id`
- `actions.ts` — `"use server"`, retorna `{ ok, data?, error? }`, `requireOrgMember`/`requireOrgRole`, `logError` em falha

Coluna `organization_id` + RLS — todas as queries são filtradas pelo guard de org. Ver `lib/supabase/CLAUDE.md` pras regras de tabela org-scoped.
