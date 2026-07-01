# Anatomia de uma funcionalidade

**Tempo de leitura:** ~7 min
**Pré-requisitos:** [Pedindo uma nova funcionalidade](./01-pedindo-uma-nova-funcionalidade.md)
**O que você vai aprender:**
- O que Claude cria quando você pede uma funcionalidade
- Pra que serve cada peça (em linguagem de leigo)
- Como cada peça conversa com as outras

---

## As 5 peças

Quando você pede algo como "quero gerenciar contatos", Claude cria (mais ou menos) 5 peças:

1. **Tabela no banco** — onde os dados ficam guardados
2. **Tipos** — descrevem pro computador como os dados se parecem
3. **Função de servidor** (Server Action) — o que fazer quando alguém clica "Salvar"
4. **Página** — o que o usuário vê no navegador
5. **Link na sidebar** — pra chegar na página

Vamos passar uma por uma.

## 1. Tabela no banco

A tabela é tipo uma **planilha do Excel**, mas guardada no Supabase. Cada linha é um "registro" (um contato, um produto, etc.) e cada coluna é uma propriedade.

Claude cria um arquivo SQL em `supabase/migrations/<timestamp>_<nome>.sql`. Esse arquivo tem instruções pro Postgres.

**Exemplo simplificado** (tabela de contatos):

```sql
create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);
```

Tradução em português:
- "Cria uma tabela chamada `contatos`"
- "Cada linha tem um ID único (gerado automaticamente)"
- "Cada contato pertence a uma organização (workspace)"
- "Cada contato tem um nome obrigatório, email opcional, telefone opcional"
- "Anota a data e hora de criação automaticamente"

### Segurança (Row Level Security)

Claude também cria **regras de segurança**: quem pode ler, escrever, atualizar e remover. Por exemplo:

> "Só membros do workspace dono dos contatos podem vê-los"

Isso é **obrigatório** em todas as tabelas do seu app. Sem isso, qualquer um podia ler o banco. O template e o Claude garantem que sempre vai ter.

## 2. Tipos (TypeScript)

Tipo é como um **dicionário de termos** que o computador usa pra não se confundir.

Depois de criar a tabela no Supabase, você roda:

```bash
npm run types
```

Isso gera um arquivo `types/supabase.ts` que descreve cada tabela e coluna do seu banco em formato que o TypeScript entende. Resultado: o computador te avisa quando você escreve `contato.namee` (errado) em vez de `contato.name` (certo).

## 3. Função de servidor (Server Action)

Quando o usuário clica em "Salvar contato", **alguma lógica precisa rodar**:
- Validar que o nome não está vazio
- Pegar a sessão do usuário
- Verificar que ele tem permissão
- Inserir no banco
- Devolver resposta de sucesso ou erro

Esse código fica em `lib/<feature>/actions.ts`. É uma "função que roda no servidor" (não no navegador).

**Exemplo simplificado:**

```typescript
"use server";

import { z } from "zod";

const createContatoSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email().optional(),
});

export async function createContatoAction(input) {
  const parsed = createContatoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos" };
  }
  // ... insere no banco, retorna sucesso
  return { ok: true };
}
```

Pra leigo: "função que diz como salvar um contato direito".

## 4. Página

A página é o que o usuário **vê e clica**. Fica em `app/(app)/app/[orgSlug]/<feature>/page.tsx`.

**Exemplo:**

```tsx
export default async function ContatosPage({ params }) {
  const { orgSlug } = await params;
  const { user, org } = await requireOrgMember({ orgSlug });

  // Busca contatos do workspace
  const contatos = await getContatos(org.id);

  return (
    <div>
      <h1>Contatos</h1>
      <ContatosList contatos={contatos} />
    </div>
  );
}
```

A função `requireOrgMember` checa se o usuário tá logado e é membro do workspace. Se não for, manda ele embora.

## 5. Link na sidebar

Pra você chegar na página `/contatos`, precisa de um link na barra lateral. Esse link fica em `config/nav.config.ts`:

```typescript
export const navItems = [
  // ... outros itens
  { path: "/contatos", label: "Contatos", icon: UsersIcon },
];
```

Adicionou no array → link aparece na sidebar de todos os workspaces.

## Como tudo conversa

```
Usuário clica em "Contatos" na sidebar
    ↓
Navega pra /app/seu-slug/contatos
    ↓
Página (page.tsx) carrega
    ↓
Página chama getContatos() que vai ao banco (com regras de segurança)
    ↓
Banco devolve só os contatos do workspace certo
    ↓
Página mostra a lista
    ↓
Usuário clica "Novo contato"
    ↓
Formulário aparece, usuário preenche e clica Salvar
    ↓
Server Action createContatoAction valida e insere no banco
    ↓
Página atualiza com o novo contato
```

## Você não precisa entender tudo

Sério. Você fala "quero uma página de contatos". Claude faz tudo isso. Você só precisa saber **mais ou menos o que cada peça é** pra quando algo der errado, conseguir descrever o problema.

## Próximo passo

Veja exemplos completos em [03-exemplos-praticos](./03-exemplos-praticos.md).

---

## ❓ Travou? Peça ajuda

Pergunta clássica: "Por que precisa de tantas peças?"

Resposta: porque cada peça tem um papel. Tabela guarda dados, página mostra, função decide regras. Se misturar tudo, vira bagunça e fica inseguro.

Cole o erro pro Claude e descreve o que tava tentando fazer.
