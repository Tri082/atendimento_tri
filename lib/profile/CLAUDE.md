# CLAUDE.md — lib/profile

Update do perfil do usuário logado (`profiles` table: full_name, avatar_url).

Mais simples que CRUDs de domínio — não tem `queries.ts` próprio (o profile do user logado vem direto de `auth.uid()` joinada).

- `schemas.ts` — Zod (nome, avatar)
- `actions.ts` — `"use server"` actions. Não chama `requireOrgMember` (perfil é global do user, não da org); usa `createClient()` direto e confia em RLS (`profiles.id = auth.uid()`).

Avatar uploads vão pro bucket `avatars` (público).
