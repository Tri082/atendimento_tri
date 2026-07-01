# CLAUDE.md — lib/deals

Pipeline de vendas. Segue o **mesmo padrão de `lib/tasks/`** (queries + actions + schemas).

Especificidades deste domínio:
- `stages.ts` — enum `deal_stage` (`new | qualified | proposal_sent | negotiation | won | lost`) + helpers de display
- `documents.ts` — anexos por deal (mesma lógica de `lib/companies/documents.ts`)
- Relação N:N com `contacts` via tabela junção `deal_contacts` (não esqueça do join quando precisar dos contatos do deal)

Coluna `organization_id` + RLS. Ver `lib/supabase/CLAUDE.md`.
