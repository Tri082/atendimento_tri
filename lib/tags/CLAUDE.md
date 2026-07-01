# CLAUDE.md — lib/tags

Sistema de tags universais (catálogo único com escopo por entidade).

## Conceito

- **Tag** é uma label colorida do catálogo da org. Cada tag declara em quais entidades pode ser aplicada (`applies_to: ['conversation','contact','company','deal']`).
- **Catálogo:** tabela `tags`. Admin gerencia (CRUD). Member só lê.
- **Junções:** uma tabela por entidade (`conversation_tag_links`, `contact_tag_links`, `company_tag_links`, `deal_tag_links`). Cada link tem `applied_by_kind` (`'human' | 'bot' | 'automation'`).
- **Sugestões:** agente IA escreve em `tag_suggestions`, NUNCA cria tags no catálogo direto. Admin promove ou ignora em Settings → Tags.

## Regras de propagação (importante)

1. **Humano aplicando em conversa** → propaga pro contato vinculado se tag tem `contact` no escopo (checkbox opt-out na UI; default true).
2. **Bot ou automação aplicando** → NUNCA propaga, mesmo com checkbox marcado. Regra hardcoded em `apply.ts`.
3. **Remover tag de uma entidade** → NÃO cascateia pras outras (mesmo que tenha chegado via propagação). Depois de propagar, viram aplicações independentes.

## Server Actions

- Admin-only (em `actions.ts`): `createTagAction`, `updateTagAction`, `deleteTagAction`, `promoteSuggestionAction`, `ignoreSuggestionAction`
- Member+ (em `apply.ts`): `applyTagTo{Conversation,Contact,Company,Deal}Action`, `removeTagFrom{...}Action`

Bot/automação chama as actions de aplicação passando `{ kind: 'bot' }` ou `{ kind: 'automation' }` no segundo argumento.

## Como agente IA usa

Em vez de criar tag direto, agente faz upsert em `tag_suggestions` via RPC `tag_suggestion_upsert`:

```ts
await supabase.rpc("tag_suggestion_upsert", {
  p_org: orgId,
  p_name: tagNome,
  p_suggested_by: "agent",
  p_source_entity: "conversation",
  p_source_id: conversationId,
});
```

A RPC incrementa `occurrences` + atualiza `last_seen_at` em conflito.

Admin vê em Settings → Tags → "Sugeridas pelo agente IA".

## Integração com automações (ver `lib/automations/CLAUDE.md`)

- **Triggers:** `conversation.tag_added`, `contact.tag_added`, `contact.tag_removed`, `deal.tag_added` (`*.tag_removed` análogos)
- **Conditions:** `*.has_tag`, `*.lacks_tag` (lookup async via JOIN nas junções)
- **Actions:** `apply_tag_to_{conversation,contact,company,deal}`, `remove_tag_from_{...}`

Action de automação aplicando tag usa `applied_by_kind = 'automation'` → não propaga. Pra aplicar nos dois lados, configurar 2 actions explícitas.

## Anti-loop

Mantém o `MAX_RECURSION_DEPTH = 5` do sub-H (`lib/automations/limits.ts`). Cadeia: tag X aplicada → automação A roda → aplica tag Y → automação B roda → aplica tag Z → ... Na 6ª camada, `emit.ts` descarta.

Idempotência via PK composto + `ON CONFLICT DO NOTHING` previne loop trivial (reaplicar a mesma tag não dispara trigger porque não houve INSERT).

## Escopo (`applies_to`)

Validação em 3 camadas:
1. Zod no Server Action (`tagScopeSchema` enum)
2. CHECK constraint na coluna (`tags_applies_to_valid_values` + `tags_applies_to_not_empty`)
3. Trigger SQL BEFORE INSERT nas 4 junções (`assert_tag_scope`) — rejeita INSERT se a tag não tem o escopo correspondente

A UI filtra opções no autocomplete por escopo, mas o trigger SQL é a defesa final.
