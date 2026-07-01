# CLAUDE.md — lib/companies

CRUD de empresas (B2B) do CRM. Segue o **mesmo padrão de `lib/tasks/`** (queries + actions + schemas). Use aquele como modelo.

Especificidade: `documents.ts` lida com anexos (PDFs/imagens) por empresa — upload pro bucket Storage org-scoped.

Coluna `organization_id` + RLS. Ver `lib/supabase/CLAUDE.md` pras regras de tabela org-scoped.
