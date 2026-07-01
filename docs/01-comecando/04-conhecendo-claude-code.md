# Conhecendo Claude Code

**Tempo de leitura:** ~8 min
**Pré-requisitos:** app rodando ([03-rodando-pela-primeira-vez](./03-rodando-pela-primeira-vez.md))
**O que você vai aprender:**
- O que é Claude Code
- Como abrir Claude Code no seu projeto
- Como conversar com ele em PT-BR
- Como escrever pedidos que ele entende

---

## O que é Claude Code

Claude Code é uma IA que **lê e escreve código** dentro do seu projeto. Você fala em português o que quer, ele faz.

A grande sacada: Claude **lê** os arquivos `CLAUDE.md` espalhados pelo seu projeto. Esses arquivos são instruções pra ele seguir o padrão certo. Você não precisa nem saber o que tem dentro — eles já estão prontos no template.

## Como abrir Claude Code

Veja https://docs.claude.com/claude-code pra instalar. Depois, no terminal, vá pra pasta do seu projeto e digite:

```bash
claude
```

Pronto, está conversando com Claude Code dentro do seu projeto.

## Como pedir as 3 coisas que você vai fazer todo dia

**Sem comando especial — fala em português coloquial.** O Claude entende e roda os passos por trás (planejar, executar, validar).

### 1. Adicionar algo novo

Quando quer uma feature nova (página, tabela, formulário):

> "Quero uma página onde meus clientes podem cadastrar contatos com nome, telefone e email."

Claude vai:
1. Perguntar 1-2 coisas pra clarificar (ex: "qualquer membro pode cadastrar ou só admins?")
2. Mostrar o plano (vou criar tabela `contatos`, página, formulário, link na sidebar)
3. Pedir sua confirmação
4. Construir tudo
5. Te dizer onde testar

### 2. Quando algo dá errado

Cole o erro e descreve o que aconteceu:

> "O botão de salvar no perfil está dando erro 500 quando eu clico. No terminal aparece: `... [cole o erro] ...`"

Claude vai investigar com calma, não chutar fix:
1. Ler os arquivos envolvidos
2. Formar uma hipótese
3. Mostrar o que vai mudar
4. Aplicar e validar reproduzindo o cenário

### 3. Preparar pra publicar

Quando seu app está pronto pra ir pro ar:

> "Quero publicar o app. Roda o checklist pré-deploy."

Claude vai rodar typecheck, build, conferir env vars, migrations, e te dar os próximos passos no EasyPanel.

## Como escrever pedidos que Claude entende

### ✅ Pedidos BONS

Específicos, com contexto:

- "Quero adicionar uma página de agendamento, com calendário e horários de 30 minutos. Só admins podem criar horários, qualquer membro pode marcar."
- "Esse formulário de cliente precisa ter campo de CPF com validação. Use o padrão brasileiro (11 dígitos, com pontuação)."
- "Quero que o dashboard mostre quantos contatos foram cadastrados nos últimos 7 dias."

### ❌ Pedidos RUINS

Muito vagos:

- "Faz um sistema bom" (o que é "bom"?)
- "Adiciona CRM" (CRM tem 50 funcionalidades diferentes)
- "Melhora o app" (Claude não sabe o que melhorar)

### Dicas

1. **Diga o "porquê"**: "Quero X porque preciso que meus usuários consigam Y"
2. **Dê um exemplo concreto**: "como o Trello, mas só com lista e cartões"
3. **Diga quem usa**: "qualquer membro" ou "só admins" ou "só donos"
4. **Não tenha medo de ser longo**: 5 linhas de pedido bem explicado > 5 mensagens trocadas

## Por que Claude às vezes pergunta antes de fazer

Pra construções grandes, Claude **sempre mostra o plano antes de executar**. Isso evita surpresas — você confirma o que vai ser feito antes de qualquer arquivo ser mudado.

Você pode dizer:
- "Sim, prossegue"
- "Sim, mas use X em vez de Y"
- "Não, pensa de outro jeito"

## Quando NÃO usar Claude Code

- **Aprender programação fundamental**: Claude faz por você. Se você quer entender, leia código primeiro.
- **Decisões de negócio**: o que vender, pra quem, por quanto — isso é com você.
- **Design visual super custom**: Claude segue o tema existente. Se quer algo radicalmente diferente, contrate um designer.

## Próximo passo

Bora criar sua primeira funcionalidade! Vai pra [02-criando-funcionalidades](../02-criando-funcionalidades/01-pedindo-uma-nova-funcionalidade.md).

---

## ❓ Travou? Peça ajuda

Se Claude Code não está fazendo o que você espera, geralmente é porque:
1. O pedido foi vago (releia "pedidos bons" acima)
2. Você está pulando o plano que ele mostra
3. Você está pedindo algo fora do escopo do template (ex: integrações complexas)

Cole o erro e descreve o problema pro Claude — ele debuga sistematicamente.
