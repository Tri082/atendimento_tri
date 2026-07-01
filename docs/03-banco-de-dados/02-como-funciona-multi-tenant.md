# Como funciona multi-tenant

**Tempo de leitura:** ~8 min
**Pré-requisitos:** [O que é Supabase](./01-o-que-e-supabase.md)
**O que você vai aprender:**
- O que é "multi-tenant" (e por que importa)
- Como organizações funcionam no template
- O que é Row Level Security (RLS) — explicado com analogia

---

## O que é multi-tenant

"Multi-tenant" significa **vários inquilinos no mesmo prédio**.

No seu SaaS, cada "inquilino" é uma empresa/conta/workspace que usa seu app. Eles compartilham o mesmo banco de dados, mas **ninguém vê os dados do outro**.

Imagina o Google Drive: você e eu usamos o mesmo serviço, mesmas tabelas no mesmo banco gigante do Google, mas eu não consigo ver seus arquivos e você não vê os meus. Esse é multi-tenant funcionando.

## Como esse template implementa

Temos 3 tabelas chave:

### `organizations` — os "inquilinos"
Cada linha é um workspace. Tem nome, slug (que aparece na URL), logo.

### `memberships` — quem pertence a qual workspace
Cada linha conecta um usuário a uma organização com um papel:
- **owner** (dono): criou a org, não pode ser removido
- **admin**: gerencia membros e configurações
- **member**: usuário comum

Um usuário pode estar em **várias organizações** com papéis diferentes em cada.

### `invitations` — convites pendentes
Quando você convida alguém por email, cria uma linha aqui com um token único. Quando a pessoa clica no link, o token é validado e ela vira membro.

## E as outras tabelas?

Toda tabela que você criar pro seu produto (contatos, produtos, tarefas, qualquer coisa) **DEVE ter uma coluna `organization_id`**. Isso é o "carimbo" dizendo a qual workspace o dado pertence.

```
contatos
┌─────┬──────────────────┬─────────────┐
│ id  │ organization_id  │ name        │
├─────┼──────────────────┼─────────────┤
│ 1   │ abc-org-id       │ João Silva  │  ← do workspace abc
│ 2   │ abc-org-id       │ Maria Costa │  ← do workspace abc
│ 3   │ xyz-org-id       │ Pedro Lima  │  ← do workspace xyz
└─────┴──────────────────┴─────────────┘
```

Quando o usuário do workspace `abc` pede a lista, ele só vê João e Maria. Pedro fica escondido.

## Row Level Security (RLS) — a analogia do prédio

RLS é a **regra de segurança no banco** que faz o filtro automático.

**Imagina um prédio de apartamentos:**
- Cada apartamento é uma organização
- O porteiro é a RLS
- Quando você chega no prédio, o porteiro olha seu crachá (`auth.uid()`) e diz: "você só pode entrar nos apartamentos 7, 12 e 23".

Sem o porteiro (RLS), qualquer um andava por qualquer apartamento. Com o porteiro, mesmo que tente, é barrado.

### Como o porteiro decide

O template tem 2 funções "ajudantes":

- **`is_org_member(org_id)`** — pergunta: "esse usuário é membro dessa org?"
- **`has_org_role(org_id, roles)`** — pergunta: "esse usuário tem um desses papéis nessa org?"

Toda regra de segurança usa uma dessas. Exemplo (regra pra ler contatos):

```sql
create policy "members read contatos"
  on public.contatos for select
  using (public.is_org_member(organization_id));
```

Tradução: "deixa selecionar contatos só se a pessoa for membro do workspace dono daquele contato".

## Por que RLS importa pra você

**Sem RLS:** se um hacker conseguisse mandar uma query SQL pro banco, veria TUDO de TODOS os workspaces. Catastrófico.

**Com RLS:** mesmo que mande a query "me dá todos os contatos", o banco só devolve o que ele tem permissão. Segurança no nível mais fundamental.

## Como Claude garante que você não vai errar

1. Toda nova tabela que Claude cria já vem com RLS habilitada
2. As policies usam `is_org_member` ou `has_org_role`
3. O CLAUDE.md raiz proíbe explicitamente Claude desabilitar RLS

Você não precisa lembrar disso — está documentado pra Claude seguir.

## Quando você quer "compartilhar dados entre orgs"

Às vezes você quer que TODOS os usuários vejam algo (ex: catálogo público de produtos). Aí você cria uma tabela **sem `organization_id`** e com uma policy pública. Mas isso é exceção, NÃO regra.

Quando precisar, peça pro Claude:
> "Quero uma tabela pública de [coisa]. Sem isolamento por workspace, todos veem."

E ele vai te avisar dos riscos.

## Como ver as policies no Supabase

1. Vá em https://supabase.com → seu projeto
2. Authentication → Policies
3. Veja todas as regras aplicadas em cada tabela

## Quando algo "não aparece" no app

Em 99% dos casos é RLS bloqueando. Cole o erro pro Claude e descreve:

> "A página de contatos está em branco mas tenho contatos cadastrados. Tela: [foto]. Console: [erro]."

Claude vai investigar se é RLS, query errada ou outra coisa.

## Próximo passo

Aprenda a [customizar tabelas existentes](./03-customizando-tabelas-existentes.md).

---

## ❓ Travou? Peça ajuda

Se "não aparece nada" ou se você tá vendo dado do workspace errado, descreve pro Claude com print da tela e dos logs do terminal.
