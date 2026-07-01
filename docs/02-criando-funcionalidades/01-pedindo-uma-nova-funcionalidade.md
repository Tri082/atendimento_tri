# Pedindo uma nova funcionalidade

**Tempo de leitura:** ~6 min
**Pré-requisitos:** [Conhecendo Claude Code](../01-comecando/04-conhecendo-claude-code.md)
**O que você vai aprender:**
- Como pedir uma feature nova direito
- Diferença entre pedido bom e pedido ruim
- O que esperar depois do "Posso prosseguir?"

---

## A receita do pedido perfeito

Você abre o Claude Code no seu projeto e fala em PT-BR o que quer. O Claude faz 5 coisas:

1. Lê seu pedido
2. Se for vago, pergunta pra clarificar
3. Lê o `CLAUDE.md` do projeto e das pastas relevantes
4. Mostra um plano com tudo que vai mudar
5. Espera você confirmar antes de mexer em nada

Quanto melhor seu pedido, menos perguntas Claude precisa fazer.

## Anatomia de um pedido bom

Um pedido bom tem 4 ingredientes:

**O quê** + **Pra quê** + **Quem pode** + **Como se parece**

### Exemplo:

> "Quero adicionar uma página de Clientes. Eu vendo serviço de consultoria e preciso anotar quem é cada cliente, quanto pagou e quando contratou. Qualquer membro pode cadastrar e ver. Imagina tipo um caderninho de clientes, mas digital."

Vamos quebrar:
- **O quê**: página de Clientes
- **Pra quê**: vendo consultoria, preciso anotar quem é cada um, quanto pagou, quando
- **Quem pode**: qualquer membro
- **Como se parece**: "caderninho de clientes digital" (Claude sabe o que isso significa)

## Exemplos de pedidos bons

> "Quero adicionar uma página de agendamento, com calendário e horários de 30 minutos. Só admins podem criar horários, qualquer membro pode marcar."

> "Esse formulário de cliente precisa ter campo de CPF com validação. Use o padrão brasileiro (11 dígitos, com pontuação)."

> "Quero que o dashboard mostre quantos contatos foram cadastrados nos últimos 7 dias."

## Exemplos de pedidos ruins

### ❌ "Adiciona um botão de pagamento"
**Por que é ruim:** que tipo de pagamento? Stripe? Mercado Pago? PIX? Pra que produto/serviço?

✅ Melhor: "Quero integrar com Mercado Pago Checkout Pro. Quando um cliente clica em Pagar Pedido, abre o checkout do Mercado Pago. Quando paga, marca o pedido como pago."

### ❌ "Adiciona um chat"
**Por que é ruim:** chat entre quem? público? privado? em tempo real?

✅ Melhor: "Quero um chat interno entre membros do workspace. Mensagens em tempo real (Supabase Realtime), histórico salvo. Sem reações ou anexos por enquanto."

## O ciclo típico

Você digita:
> "Quero uma página de tarefas."

Claude responde:
> Antes de começar, 2 perguntas rápidas:
> 1. Cada tarefa tem dono específico ou qualquer membro pode marcar como feita?
> 2. Quer prioridade (alta/média/baixa) ou só feita/não-feita?

Você responde:
> 1. Qualquer membro marca como feita. 2. Só feita/não-feita.

Claude responde:
> Plano:
> - Criar tabela `tasks` (id, organization_id, title, completed, created_by, created_at)
> - Criar página /tarefas com listagem e botão "+ Nova"
> - Server Actions: createTask, toggleTaskCompleted, deleteTask
> - Adicionar link "Tarefas" na sidebar
>
> Tá bom assim?

Você responde:
> Sim, prossegue.

Claude faz tudo, te diz "pronto, abre /app/seu-slug/tarefas".

## Se Claude propõe algo errado

Não tem medo de dizer "não". Exemplos:

- "Não, eu queria que cada tarefa tivesse data de vencimento também"
- "Não use esse padrão, prefere algo mais simples"
- "Pula a parte X por enquanto, faz só Y"

## Próximo passo

Veja o que Claude **realmente cria** quando você pede em [02-anatomia-de-uma-funcionalidade](./02-anatomia-de-uma-funcionalidade.md).

---

## ❓ Travou? Peça ajuda

Se Claude está fazendo coisas que você não pediu, peça pra reverter:
> "Reverte o que você acabou de fazer, vamos repensar o plano."

Se algo quebrou, cole o erro e descreve o que tava fazendo.
