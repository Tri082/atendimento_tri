# Exemplos práticos

**Tempo de leitura:** ~10 min
**Pré-requisitos:** [Anatomia de uma funcionalidade](./02-anatomia-de-uma-funcionalidade.md)
**O que você vai aprender:**
- 4 exemplos completos de pedidos pro Claude
- O que ele cria pra cada um
- Variações pra adaptar ao seu produto

---

## Exemplo 1: CRM simples

### Pedido

> "Quero um mini CRM. Preciso gerenciar leads: cada lead tem nome, email, telefone, origem (instagram, indicação, anúncio, outro), status (novo, em contato, ganho, perdido) e observações. Qualquer membro vê e edita."

### O que Claude faz

1. Cria tabela `leads` com as colunas pedidas
2. Cria página `/app/{slug}/leads` listando leads
3. Cria formulário pra criar/editar lead
4. Cria Server Actions pra create, update, delete
5. Adiciona "Leads" na sidebar

### Próximos pedidos típicos

- "Adiciona um filtro por status na página de leads"
- "Quando um lead vira ganho, manda email automático pro time"
- "Mostra no dashboard quantos leads novos teve essa semana"

## Exemplo 2: Sistema de tarefas

### Pedido

> "Quero um Trello simples. Tarefas com título, descrição, data de vencimento e status (a fazer/fazendo/feito). Qualquer membro cria e mexe. Mostra agrupado por status (3 colunas)."

### O que Claude faz

1. Cria tabela `tasks` com status enum
2. Cria página `/app/{slug}/tarefas` com 3 colunas (kanban estilo)
3. Cria Server Actions para criar, atualizar status (mover entre colunas), deletar
4. Adiciona "Tarefas" na sidebar

### Próximos pedidos

- "Adiciona drag-and-drop entre as colunas" (mais complexo, pode pedir biblioteca)
- "Cada tarefa pode ter responsável (membro do workspace)"
- "Notifica por email 1 dia antes do vencimento" (precisa cron job)

## Exemplo 3: Catálogo de produtos

### Pedido

> "Vendo bolos sob encomenda. Quero cadastrar meus produtos: nome, descrição, foto, preço, tempo de preparo. Foto vai pro Storage do Supabase. Qualquer membro cadastra, mas só admin remove."

### O que Claude faz

1. Cria tabela `produtos`
2. Cria página `/app/{slug}/produtos` com grade de cards
3. Form com upload de imagem usando Supabase Storage (já configurado no template)
4. Server Action `createProduto` salva e faz upload
5. Botão "Remover" só aparece pra admins/owners

### Próximos pedidos

- "Adiciona categorias (bolos, doces, salgados) com filtro"
- "Quero página pública de catálogo (sem login)" — atenção: muda padrão de RLS

## Exemplo 4: Agendamento simples

### Pedido

> "Sou consultor. Quero que clientes (sem cadastro!) consigam ver minha disponibilidade e marcar reunião comigo. Eu cadastro horários disponíveis (data + hora), cliente preenche nome+email e clica marcar."

### O que Claude faz

(Esse é mais complexo, vai gerar mais perguntas.)

1. Tabela `slots` (horários disponíveis): só admin cria
2. Tabela `bookings` (reservas)
3. Página interna `/app/{slug}/agenda` pra você gerenciar horários
4. **Página pública** `/{orgSlug}/agenda` (sem login) pra cliente marcar
5. Server Action `bookSlot` que valida e cria reserva
6. Email de confirmação pro cliente E pra você

### O que pode dar errado e Claude vai te avisar

- "Esse pedido tem uma página pública. Vai expor dados da sua org sem autenticação. Tá ciente?"
- "Pra mandar email pro cliente, precisa configurar Resend (sem isso, fallback no terminal)"

## Padrões que aparecem sempre

Você vai notar que TODOS os exemplos têm:
- **Tabela com `organization_id`** — isolamento por workspace
- **RLS aplicada** — segurança no banco
- **Páginas dentro de `/app/{slug}/`** — exige login + membership
- **Server Actions com Zod** — validação de input

Esses padrões NÃO mudam. Claude segue eles porque está nos `CLAUDE.md` do projeto.

## Quando o pedido é grande demais

Se você pede algo como "Quero um sistema completo de gestão escolar com matrículas, notas, presença, mensalidade e relatórios" — Claude vai te sugerir **quebrar em pedaços**:

1. Primeiro: cadastro de alunos (uma tabela só)
2. Depois: turmas e matrículas
3. Depois: lançamento de notas
4. Por último: relatórios

Isso é bom! Quebrar é melhor porque:
- Você testa cada peça
- Erros são fáceis de achar
- Você decide se mudou de ideia no meio

## Próximo passo

Vai entender mais sobre o banco em [03-banco-de-dados](../03-banco-de-dados/01-o-que-e-supabase.md).

---

## ❓ Travou? Peça ajuda

Se algo concreto deu errado, cole o erro pro Claude e descreve o que tava fazendo. Pra dúvidas conceituais (tipo "quando uso uma tabela vs outra?"), apenas pergunte em linguagem natural pro Claude.
