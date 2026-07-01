# Customizando tabelas existentes

**Tempo de leitura:** ~6 min
**Pré-requisitos:** [Como funciona multi-tenant](./02-como-funciona-multi-tenant.md)
**O que você vai aprender:**
- Como adicionar uma coluna numa tabela existente
- O que NUNCA mudar (e por quê)
- Como reverter se algo der errado

---

## Como adicionar uma coluna

Imagina que você quer adicionar **WhatsApp** na tabela de profiles.

### Passo 1: Pedir pro Claude

> "Adiciona uma coluna `whatsapp` (text, opcional) na tabela profiles. Também atualiza o formulário de Meu Perfil pra editar."

### Passo 2: Claude faz

1. Cria migration `supabase/migrations/<timestamp>_add_whatsapp_to_profiles.sql`:
   ```sql
   alter table public.profiles add column whatsapp text;
   ```
2. Pede pra você aplicar (via SQL Editor ou Supabase CLI)
3. Roda `npm run types` pra regenerar tipos
4. Atualiza `lib/profile/schemas.ts` adicionando o campo `whatsapp` no Zod
5. Atualiza `lib/profile/actions.ts` pra salvar no banco
6. Atualiza `app/(app)/app/[orgSlug]/settings/profile/profile-form.tsx` adicionando o `<TextField name="whatsapp" />`

### Passo 3: Validar

```bash
npm run build
```

Se passar, abre a página → testa a edição.

## O que NUNCA mudar

### `id`
A coluna `id` é a identidade única do registro. Mudar quebra todas as referências.

### `organization_id`
É o que faz multi-tenancy funcionar. Mudar pode misturar dados entre workspaces (catástrofe).

### `created_at`
Mexer aqui distorce histórico.

### Constraint `NOT NULL` em coluna que já tem dados
Se a tabela tem 1000 linhas com `email NULL`, e você tenta adicionar `NOT NULL`, vai falhar. Tem que **primeiro preencher os nulos com algum valor padrão**, depois adicionar a constraint.

## Adicionar coluna obrigatória numa tabela existente

Esse é tricky. Se você quer adicionar `phone NOT NULL` mas já tem usuários sem telefone:

**Errado:**
```sql
alter table profiles add column phone text not null;  -- VAI FALHAR
```

**Certo (2 passos):**
```sql
-- 1. Adiciona coluna nullable
alter table profiles add column phone text;

-- 2. Preenche valores padrão pros existentes
update profiles set phone = 'desconhecido' where phone is null;

-- 3. Agora pode tornar obrigatório
alter table profiles alter column phone set not null;
```

Claude sabe fazer isso quando você avisa "tem dados existentes". Sempre fale a verdade pra ele.

## Renomear uma coluna

Cuidado: renomear quebra todo o código que usa o nome antigo. Claude vai precisar atualizar tipos, queries, forms, etc. **Faça em desenvolvimento primeiro, nunca em produção sem testar**.

Pedido típico:
> "Renomeia a coluna `phone` pra `whatsapp` na tabela profiles. Atualiza tudo que usa."

## Remover uma coluna

Mais perigoso ainda — perde dados. Claude vai avisar:
> "Você quer mesmo remover essa coluna? Os dados serão **perdidos**. Backup primeiro?"

## Mudar tipo de uma coluna

Tipos compatíveis (ex: `text` → `varchar(100)`) costumam funcionar. Mudanças incompatíveis (ex: `text` → `integer`) podem falhar se tiver dado que não converte.

## Como reverter

Migrations no Supabase são **histórico permanente**. Você não "desfaz" — você cria outra migration que **reverte** a mudança.

Exemplo: você adicionou `whatsapp` e quer remover:

```sql
-- migration: remove_whatsapp_from_profiles
alter table public.profiles drop column whatsapp;
```

Aplica essa migration nova. Pronto.

> ⚠️ Se a coluna tem dados, eles SERÃO perdidos. Sempre faça backup antes de remover coluna no Supabase: Database → Backups.

## Adicionar índice (índice = busca rápida)

Se você tem muitos contatos e busca por email frequente, adiciona índice:

```sql
create index contatos_email_idx on public.contatos(email);
```

Quando pedir pro Claude:
> "Estou com lentidão na busca de contatos por email. Otimiza."

Claude vai analisar e provavelmente sugerir índice (se for o caso).

## Próximo passo

Quando estiver tudo pronto, [prepare pra publicar](../04-publicando/01-preparando-para-publicar.md).

---

## ❓ Travou? Peça ajuda

Mudanças no banco em produção exigem cuidado. Se algo deu errado, cole o erro completo pro Claude.
